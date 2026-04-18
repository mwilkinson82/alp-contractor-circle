/**
 * Async XER Import — handles large P6 XER files without hitting proxy timeouts.
 *
 * Flow:
 * 1. POST /api/xer/upload — client sends the XER file text, server stores to S3,
 *    creates an import job row, returns jobId immediately.
 * 2. Server processes the import in the background (no request held open).
 * 3. GET /api/xer/status/:jobId — client polls for progress.
 */
import type { Express, Request, Response } from "express";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { storagePut } from "./storage";
import * as sdb from "./scheduleDb";
import { importXerFile } from "./xerImport";

// ─── Auth helper (same pattern as scheduleRouter) ──────────────────────────

async function authenticateMember(req: Request) {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (!session) return null;
  const member = await getMemberById(session.memberId);
  return member || null;
}

// ─── In-memory progress tracker for active imports ─────────────────────────

const activeJobs = new Map<number, { status: string; message: string }>();

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerXerImportRoutes(app: Express) {
  // POST /api/xer/upload — upload XER text, start async import
  app.post("/api/xer/upload", async (req: Request, res: Response) => {
    try {
      const member = await authenticateMember(req);
      if (!member) return res.status(401).json({ error: "Not authenticated" });

      const { xerText, scheduleName } = req.body;
      if (!xerText || typeof xerText !== "string" || xerText.length < 10) {
        return res.status(400).json({ error: "Missing or invalid xerText" });
      }

      console.log(`[XER Async] Member ${member.id} uploading XER (${(xerText.length / 1024 / 1024).toFixed(1)} MB)...`);

      // 1. Upload XER text to S3
      const fileKey = `xer-imports/${member.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xer`;
      const { url: fileUrl } = await storagePut(fileKey, xerText, "text/plain");
      console.log(`[XER Async] Uploaded to S3: ${fileKey}`);

      // 2. Create import job record
      const { id: jobId } = await sdb.createXerImportJob({
        memberId: member.id,
        fileUrl,
        scheduleName: scheduleName || undefined,
        status: "pending",
        progressMessage: "Upload complete — starting import...",
      });

      // 3. Return jobId immediately (fast response, no timeout risk)
      res.json({ jobId });

      // 4. Process import in background (fire-and-forget)
      processXerImport(jobId, xerText, member.id, scheduleName || undefined).catch((err) => {
        console.error(`[XER Async] Background import failed for job ${jobId}:`, err);
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
  xerText: string,
  memberId: number,
  scheduleName?: string,
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

  try {
    await updateProgress("parsing", "Parsing XER file...");

    const result = await importXerFile(xerText, memberId, scheduleName);

    await sdb.updateXerImportJob(jobId, {
      status: "complete",
      progressMessage: `Import complete — ${result.activitiesImported} activities, ${result.relationshipsImported} relationships, ${result.wbsNodesImported} WBS nodes`,
      scheduleId: result.scheduleId,
      result: result as any,
    });

    activeJobs.delete(jobId);
    console.log(`[XER Async] Job ${jobId} complete: schedule #${result.scheduleId}`);
  } catch (err: any) {
    console.error(`[XER Async] Job ${jobId} failed:`, err);
    await sdb.updateXerImportJob(jobId, {
      status: "failed",
      progressMessage: "Import failed",
      errorMessage: err.message || "Unknown error",
    });
    activeJobs.delete(jobId);
  }
}
