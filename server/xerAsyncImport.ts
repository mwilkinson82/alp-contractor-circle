/**
 * Async XER Import — handles large P6 XER files without hitting proxy timeouts.
 *
 * Flow:
 * 1. POST /api/xer/upload — client sends the XER file via FormData (multipart),
 *    server creates a job record immediately and returns jobId within 1-2 seconds.
 * 2. Server processes the import in the background (S3 upload + parsing + DB inserts).
 * 3. GET /api/xer/status/:jobId — client polls for progress.
 *
 * Key optimizations:
 * - Uses FormData/multipart upload (not JSON) for efficient large file transfer
 * - Job record is created BEFORE any heavy processing
 * - Response is sent BEFORE S3 upload or parsing begins
 * - XER text is held in memory temporarily during background processing
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { storagePut } from "./storage";
import * as sdb from "./scheduleDb";
import { importXerFile } from "./xerImport";

// ─── Multer config for multipart file upload ───────────────────────────────
// Store in memory (we'll pass the buffer to background processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// ─── Auth helper (same pattern as scheduleRouter) ──────────────────────────

/** Whitelisted member IDs — bypass subscription check. Daniel G (1320007), alpteambot (360002). */
const WHITELISTED_MEMBER_IDS = new Set([1320007, 360002]);

async function authenticateMember(req: Request) {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (!session) return null;
  const member = await getMemberById(session.memberId);
  if (!member) return null;
  // Whitelisted members bypass subscription check
  if (WHITELISTED_MEMBER_IDS.has(member.id)) return member;
  // Everyone else must have an active subscription
  if (member.subscriptionStatus !== "active") return null;
  return member;
}

// ─── In-memory progress tracker for active imports ─────────────────────────

const activeJobs = new Map<number, { status: string; message: string }>();

// ─── In-memory store for XER text during background processing ─────────────
const pendingTexts = new Map<number, string>();

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerXerImportRoutes(app: Express) {
  // POST /api/xer/upload — accept XER file via FormData or JSON, create job, return jobId FAST
  app.post("/api/xer/upload", upload.single("xerFile"), async (req: Request, res: Response) => {
    try {
      const member = await authenticateMember(req);
      if (!member) return res.status(401).json({ error: "Not authenticated" });

      let xerText: string;
      let scheduleName: string | undefined;

      // Support both FormData (multipart) and JSON body
      if (req.file) {
        // FormData upload — file is in req.file.buffer
        xerText = req.file.buffer.toString("utf-8");
        scheduleName = req.body?.scheduleName || undefined;
      } else if (req.body?.xerText) {
        // Legacy JSON body (backwards compatible)
        xerText = req.body.xerText;
        scheduleName = req.body.scheduleName || undefined;
      } else {
        return res.status(400).json({ error: "Missing XER file. Upload via FormData or provide xerText in JSON body." });
      }

      if (typeof xerText !== "string" || xerText.length < 10) {
        return res.status(400).json({ error: "XER file is empty or too small" });
      }

      const sizeMB = (xerText.length / 1024 / 1024).toFixed(1);
      console.log(`[XER Async] Member ${member.id} uploading XER (${sizeMB} MB text)...`);

      // 1. Create import job record FIRST (fast DB insert, no S3 yet)
      const { id: jobId } = await sdb.createXerImportJob({
        memberId: member.id,
        fileUrl: `pending-upload-${Date.now()}`,
        scheduleName: scheduleName || undefined,
        status: "pending",
        progressMessage: "Upload received — starting import...",
      });

      console.log(`[XER Async] Created job ${jobId} — responding to client immediately`);

      // 2. Store text in memory for background processing
      pendingTexts.set(jobId, xerText);

      // 3. Return jobId IMMEDIATELY (fast response, no timeout risk)
      res.json({ jobId });

      // 4. Process everything in background (fire-and-forget)
      setImmediate(() => {
        processXerImport(jobId, member.id, scheduleName).catch((err) => {
          console.error(`[XER Async] Background import failed for job ${jobId}:`, err);
        });
      });
    } catch (err: any) {
      console.error("[XER Async] Upload error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // GET /api/xer/status/:jobId — poll import progress
  app.get("/api/xer/status/:jobId", async (req: Request, res: Response) => {
    try {
      const member = await authenticateMember(req);
      if (!member) return res.status(401).json({ error: "Not authenticated" });

      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid jobId" });

      // Check in-memory progress first (more up-to-date during active processing)
      const inMemory = activeJobs.get(jobId);

      const job = await sdb.getXerImportJob(jobId);
      if (!job) return res.status(404).json({ error: "Import job not found" });
      if (job.memberId !== member.id) return res.status(403).json({ error: "Not your import" });

      res.json({
        jobId: job.id,
        status: job.status,
        progressMessage: inMemory?.message || job.progressMessage,
        scheduleId: job.scheduleId,
        result: job.result,
        errorMessage: job.errorMessage,
      });
    } catch (err: any) {
      console.error("[XER Async] Status check error:", err);
      res.status(500).json({ error: err.message || "Status check failed" });
    }
  });
}

// ─── Background processor ──────────────────────────────────────────────────

async function processXerImport(
  jobId: number,
  memberId: number,
  scheduleName?: string,
) {
  // Retrieve the XER text from in-memory store
  const xerText = pendingTexts.get(jobId);
  if (!xerText) {
    console.error(`[XER Async] No text found in memory for job ${jobId}`);
    await sdb.updateXerImportJob(jobId, {
      status: "failed",
      progressMessage: "Import failed",
      errorMessage: "XER text was lost — please try again",
    });
    return;
  }

  const updateProgress = async (status: string, message: string) => {
    activeJobs.set(jobId, { status, message });
    try {
      await sdb.updateXerImportJob(jobId, {
        status: status as any,
        progressMessage: message,
      });
    } catch (e) {
      console.error(`[XER Async] Failed to update job ${jobId} progress:`, e);
    }
  };

  try {
    // Step 1: Upload to S3 (in background, no timeout pressure)
    await updateProgress("pending", "Uploading file to storage...");
    const fileKey = `xer-imports/${memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xer`;
    try {
      const { url: fileUrl } = await storagePut(fileKey, xerText, "text/plain");
      console.log(`[XER Async] Job ${jobId}: uploaded to S3 (${fileKey})`);
      await sdb.updateXerImportJob(jobId, { fileUrl });
    } catch (s3Err: any) {
      console.warn(`[XER Async] Job ${jobId}: S3 upload failed (non-fatal):`, s3Err.message);
    }

    // Step 2: Parse and import
    await updateProgress("parsing", "Parsing XER file...");

    const result = await importXerFile(xerText, memberId, scheduleName, async (message) => {
      await updateProgress("parsing", message);
    });

    // Step 3: Mark complete
    await sdb.updateXerImportJob(jobId, {
      status: "complete",
      progressMessage: `Import complete — ${result.activitiesImported} activities, ${result.relationshipsImported} relationships, ${result.wbsNodesImported} WBS nodes`,
      scheduleId: result.scheduleId,
      result: result as any,
    });

    activeJobs.delete(jobId);
    pendingTexts.delete(jobId);
    console.log(`[XER Async] Job ${jobId} complete: schedule #${result.scheduleId}`);
  } catch (err: any) {
    console.error(`[XER Async] Job ${jobId} failed:`, err);
    await sdb.updateXerImportJob(jobId, {
      status: "failed",
      progressMessage: "Import failed",
      errorMessage: err.message || "Unknown error",
    });
    activeJobs.delete(jobId);
    pendingTexts.delete(jobId);
  }
}
