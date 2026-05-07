/**
 * Async XER Import — handles large P6 XER files without hitting proxy timeouts.
 *
 * Flow:
 * 1. POST /api/xer/upload — client sends the XER file via FormData (multipart),
 *    server persists the raw XER file to durable storage and returns a jobId.
 * 2. GET /api/xer/status/:jobId — the first poll claims and processes the import
 *    inside an active HTTP request so Cloud Run keeps CPU allocated.
 * 3. Later polls read persisted progress from the job record.
 *
 * Key optimizations:
 * - Uses FormData/multipart upload (not JSON) for efficient large file transfer
 * - No critical import state is held only in memory after upload
 * - Durable storage is the source of truth for the uploaded XER
 * - Job status prevents duplicate imports from overlapping status polls
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { storageGet, storagePut } from "./storage";
import * as sdb from "./scheduleDb";
import { processChunkedXerImportSteps } from "./xerImport";

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

// ─── In-memory progress tracker for active import requests ─────────────────

const activeJobs = new Map<number, { status: string; message: string }>();
const runningJobs = new Set<number>();

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerXerImportRoutes(app: Express) {
  // POST /api/xer/upload — accept XER file via FormData or JSON, persist it, create job, return jobId
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

      const fileKey = `xer-imports/${member.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xer`;
      const { key } = await storagePut(fileKey, xerText, "text/plain");
      console.log(`[XER Async] Stored XER upload for member ${member.id}: ${key}`);

      const { id: jobId } = await sdb.createXerImportJob({
        memberId: member.id,
        fileUrl: key,
        scheduleName: scheduleName || undefined,
        status: "pending",
        progressMessage: `Upload complete (${sizeMB} MB) — waiting to start import...`,
      });

      console.log(`[XER Async] Created durable import job ${jobId}`);

      res.json({ jobId });
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

      if ((job.status === "pending" || job.status === "parsing") && !runningJobs.has(jobId)) {
        const claimed = await sdb.claimXerImportJob(job.id, member.id);
        if (claimed) {
          await advanceXerImportJob(job.id, member.id, job.fileUrl, job.scheduleName || undefined, job.result);
        }
      } else if (job.status === "importing" && !runningJobs.has(jobId)) {
        await advanceXerImportJob(job.id, member.id, job.fileUrl, job.scheduleName || undefined, job.result);
      }

      const latestJob = await sdb.getXerImportJob(jobId);
      if (!latestJob) return res.status(404).json({ error: "Import job not found" });
      const latestInMemory = activeJobs.get(jobId);

      res.json(formatJobResponse(latestJob, latestInMemory));
    } catch (err: any) {
      console.error("[XER Async] Status check error:", err);
      res.status(500).json({ error: err.message || "Status check failed" });
    }
  });
}

// ─── Chunked request processor ─────────────────────────────────────────────

async function advanceXerImportJob(
  jobId: number,
  memberId: number,
  fileKey: string,
  scheduleName?: string,
  rawState?: unknown,
) {
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

  runningJobs.add(jobId);
  try {
    await updateProgress("importing", "Loading uploaded XER file from storage...");
    const xerText = await loadStoredXerText(fileKey);

    await updateProgress("importing", "Reading P6 tables from XER file...");

    const step = await processChunkedXerImportSteps(
      xerText,
      memberId,
      scheduleName,
      rawState,
      async (message) => {
        await updateProgress("importing", message);
      },
      {
        // Stay comfortably below common proxy/request limits while still doing
        // several DB chunks per active poll. This avoids reparsing the same XER
        // once for every 1,000 activities on large P6 exports.
        maxDurationMs: 45_000,
        maxSteps: 25,
      },
    );

    if (step.complete && step.result) {
      await sdb.updateXerImportJob(jobId, {
        status: "complete",
        progressMessage: `Import complete — ${step.result.activitiesImported.toLocaleString()} activities, ${step.result.relationshipsImported.toLocaleString()} relationships, ${step.result.wbsNodesImported.toLocaleString()} WBS nodes`,
        scheduleId: step.result.scheduleId,
        result: step.result as any,
      });
      activeJobs.delete(jobId);
      console.log(`[XER Async] Job ${jobId} complete: schedule #${step.result.scheduleId}`);
      return;
    }

    await sdb.updateXerImportJob(jobId, {
      status: "importing",
      progressMessage: activeJobs.get(jobId)?.message || "Import is still running...",
      scheduleId: step.state.scheduleId,
      result: step.state as any,
    });
  } catch (err: any) {
    console.error(`[XER Async] Job ${jobId} failed:`, err);
    const state = rawState && typeof rawState === "object" ? rawState as { scheduleId?: number } : null;
    if (state?.scheduleId) {
      try {
        await sdb.deleteSchedule(state.scheduleId);
      } catch (cleanupErr) {
        console.error(`[XER Async] Failed to clean up partial schedule #${state.scheduleId}:`, cleanupErr);
      }
    }
    await sdb.updateXerImportJob(jobId, {
      status: "failed",
      progressMessage: "Import failed",
      errorMessage: err.message || "Unknown error",
    });
    activeJobs.delete(jobId);
  } finally {
    runningJobs.delete(jobId);
  }
}

async function loadStoredXerText(fileKeyOrUrl: string) {
  if (!fileKeyOrUrl || fileKeyOrUrl.startsWith("pending-upload-")) {
    throw new Error("Stored XER file was not found. Please upload the XER again.");
  }

  const downloadUrl = /^https?:\/\//i.test(fileKeyOrUrl)
    ? fileKeyOrUrl
    : (await storageGet(fileKeyOrUrl)).url;

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Unable to load stored XER file (${response.status} ${response.statusText}): ${message}`);
  }

  return response.text();
}

function formatJobResponse(
  job: Awaited<ReturnType<typeof sdb.getXerImportJob>>,
  inMemory?: { status: string; message: string },
) {
  if (!job) throw new Error("Import job not found");
  return {
    jobId: job.id,
    status: job.status,
    progressMessage: inMemory?.message || job.progressMessage,
    scheduleId: job.scheduleId,
    result: job.result,
    errorMessage: job.errorMessage,
  };
}
