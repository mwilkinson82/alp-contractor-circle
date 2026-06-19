export type TakeoffLivePhase =
  | "indexing"
  | "extracting"
  | "post_processing"
  | "completed"
  | "error";

export interface TakeoffLiveProgress {
  projectId: number;
  phase: TakeoffLivePhase;
  statusText: string;
  detailText?: string | null;
  totalSheets: number;
  completedSheets: number;
  failedSheets: number;
  skippedSheets: number;
  currentBatch?: number | null;
  totalBatches?: number | null;
  currentPage?: number | null;
  currentSheetName?: string | null;
  startedAt: string;
  lastHeartbeatAt: string;
}

type ProgressPatch = Partial<
  Omit<TakeoffLiveProgress, "projectId" | "startedAt" | "lastHeartbeatAt">
>;

const liveProgressByProject = new Map<number, TakeoffLiveProgress>();
const COMPLETED_PROGRESS_TTL_MS = 30 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function scheduleProgressCleanup(projectId: number, expectedHeartbeat: string) {
  const timeout = setTimeout(() => {
    const current = liveProgressByProject.get(projectId);
    if (current?.lastHeartbeatAt === expectedHeartbeat) {
      liveProgressByProject.delete(projectId);
    }
  }, COMPLETED_PROGRESS_TTL_MS);
  if (typeof (timeout as any).unref === "function") {
    (timeout as any).unref();
  }
}

export function startTakeoffLiveProgress(
  projectId: number,
  progress: ProgressPatch
) {
  const timestamp = nowIso();
  liveProgressByProject.set(projectId, {
    projectId,
    phase: progress.phase || "indexing",
    statusText: progress.statusText || "Preparing ConstructLine analysis...",
    detailText: progress.detailText ?? null,
    totalSheets: progress.totalSheets || 0,
    completedSheets: progress.completedSheets || 0,
    failedSheets: progress.failedSheets || 0,
    skippedSheets: progress.skippedSheets || 0,
    currentBatch: progress.currentBatch ?? null,
    totalBatches: progress.totalBatches ?? null,
    currentPage: progress.currentPage ?? null,
    currentSheetName: progress.currentSheetName ?? null,
    startedAt: timestamp,
    lastHeartbeatAt: timestamp,
  });
}

export function updateTakeoffLiveProgress(
  projectId: number,
  progress: ProgressPatch
) {
  const timestamp = nowIso();
  const current = liveProgressByProject.get(projectId);
  if (!current) {
    startTakeoffLiveProgress(projectId, progress);
    return;
  }

  liveProgressByProject.set(projectId, {
    ...current,
    ...progress,
    detailText:
      progress.detailText !== undefined
        ? progress.detailText
        : current.detailText,
    currentBatch:
      progress.currentBatch !== undefined
        ? progress.currentBatch
        : current.currentBatch,
    totalBatches:
      progress.totalBatches !== undefined
        ? progress.totalBatches
        : current.totalBatches,
    currentPage:
      progress.currentPage !== undefined
        ? progress.currentPage
        : current.currentPage,
    currentSheetName:
      progress.currentSheetName !== undefined
        ? progress.currentSheetName
        : current.currentSheetName,
    lastHeartbeatAt: timestamp,
  });
}

export function finishTakeoffLiveProgress(
  projectId: number,
  phase: Extract<TakeoffLivePhase, "completed" | "error">,
  statusText: string,
  progress: ProgressPatch = {}
) {
  updateTakeoffLiveProgress(projectId, {
    ...progress,
    phase,
    statusText,
    currentBatch: null,
    totalBatches: null,
    currentPage: null,
    currentSheetName: null,
  });
  const completed = liveProgressByProject.get(projectId);
  if (completed) {
    scheduleProgressCleanup(projectId, completed.lastHeartbeatAt);
  }
}

export function clearTakeoffLiveProgress(projectId: number) {
  liveProgressByProject.delete(projectId);
}

export function getTakeoffLiveProgress(projectId: number) {
  return liveProgressByProject.get(projectId) || null;
}

export function getTakeoffLiveProgressHeartbeatAgeMs(projectId: number) {
  const progress = getTakeoffLiveProgress(projectId);
  if (!progress) return null;
  const heartbeatMs = new Date(progress.lastHeartbeatAt).getTime();
  if (!Number.isFinite(heartbeatMs)) return null;
  return Date.now() - heartbeatMs;
}
