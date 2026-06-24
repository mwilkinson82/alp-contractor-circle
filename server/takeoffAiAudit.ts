import { createHash } from "crypto";
import {
  invokeLLMWithTimeout,
  resolveLLMModel,
  resolveLLMProvider,
  type InvokeParams,
  type InvokeResult,
} from "./_core/llm";
import { createTakeoffLlmAttempt } from "./takeoffObservabilityDb";

export type TakeoffPassType =
  | "sheet_index"
  | "takeoff_extract"
  | "takeoff_verify"
  | "labor_task_group"
  | "labor_item_preview";

export const TAKEOFF_PROMPT_VERSIONS: Record<TakeoffPassType, string> = {
  sheet_index: "sheet-index-v1",
  takeoff_extract: "takeoff-extract-v2",
  takeoff_verify: "takeoff-verify-v1",
  labor_task_group: "labor-task-group-v1",
  labor_item_preview: "labor-item-preview-v1",
};

const PASS_MODEL_ENV: Record<TakeoffPassType, string[]> = {
  sheet_index: ["OPENAI_MODEL_SHEET_INDEX", "CONSTRUCTLINE_MODEL_SHEET_INDEX"],
  takeoff_extract: [
    "OPENAI_MODEL_TAKEOFF_EXTRACT",
    "CONSTRUCTLINE_MODEL_EXTRACT",
  ],
  takeoff_verify: ["OPENAI_MODEL_TAKEOFF_VERIFY", "CONSTRUCTLINE_MODEL_VERIFY"],
  labor_task_group: ["OPENAI_MODEL_LABOR", "CONSTRUCTLINE_MODEL_LABOR"],
  labor_item_preview: ["OPENAI_MODEL_LABOR", "CONSTRUCTLINE_MODEL_LABOR"],
};

const PASS_TIMEOUT_ENV: Record<TakeoffPassType, string[]> = {
  sheet_index: [
    "CONSTRUCTLINE_LLM_TIMEOUT_SHEET_INDEX_MS",
    "TAKEOFF_LLM_TIMEOUT_SHEET_INDEX_MS",
  ],
  takeoff_extract: [
    "CONSTRUCTLINE_LLM_TIMEOUT_EXTRACT_MS",
    "TAKEOFF_LLM_TIMEOUT_EXTRACT_MS",
  ],
  takeoff_verify: [
    "CONSTRUCTLINE_LLM_TIMEOUT_VERIFY_MS",
    "TAKEOFF_LLM_TIMEOUT_VERIFY_MS",
  ],
  labor_task_group: [
    "CONSTRUCTLINE_LLM_TIMEOUT_LABOR_MS",
    "TAKEOFF_LLM_TIMEOUT_LABOR_MS",
  ],
  labor_item_preview: [
    "CONSTRUCTLINE_LLM_TIMEOUT_LABOR_MS",
    "TAKEOFF_LLM_TIMEOUT_LABOR_MS",
  ],
};

const DEFAULT_PASS_TIMEOUT_MS: Record<TakeoffPassType, number> = {
  sheet_index: 150_000,
  takeoff_extract: 300_000,
  takeoff_verify: 240_000,
  labor_task_group: 90_000,
  labor_item_preview: 90_000,
};

export function resolveTakeoffModelForPass(passType: TakeoffPassType): string {
  for (const envName of PASS_MODEL_ENV[passType] || []) {
    const value = process.env[envName]?.trim();
    if (value) return value;
  }
  return resolveLLMModel();
}

export function getTakeoffModelProfile(): string {
  const profile = {
    index: resolveTakeoffModelForPass("sheet_index"),
    extract: resolveTakeoffModelForPass("takeoff_extract"),
    verify: resolveTakeoffModelForPass("takeoff_verify"),
    labor: resolveTakeoffModelForPass("labor_task_group"),
  };
  return JSON.stringify(profile);
}

function sanitizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForHash);
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (
      key === "url" &&
      typeof raw === "string" &&
      /^(data:|https?:|\/)/i.test(raw)
    ) {
      result[key] = "[image-url-redacted]";
    } else {
      result[key] = sanitizeForHash(raw);
    }
  }
  return result;
}

function hashPrompt(params: InvokeParams): string {
  return createHash("sha256")
    .update(JSON.stringify(sanitizeForHash(params.messages)))
    .digest("hex");
}

function numberFromEnv(names: string[]): number | null {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function positiveNumberFromEnv(names: string[]): number | null {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function resolveTakeoffLlmTimeoutMs(passType: TakeoffPassType): number {
  return (
    positiveNumberFromEnv([
      ...(PASS_TIMEOUT_ENV[passType] || []),
      "CONSTRUCTLINE_LLM_TIMEOUT_MS",
      "TAKEOFF_LLM_TIMEOUT_MS",
      "LLM_TIMEOUT_MS",
    ]) || DEFAULT_PASS_TIMEOUT_MS[passType]
  );
}

function estimateUsageCostCents(usage: InvokeResult["usage"]): number | null {
  if (!usage) return null;
  const reportedTotalCost = usage.cost?.total_cost;
  if (Number.isFinite(reportedTotalCost)) {
    return Math.round((reportedTotalCost as number) * 100);
  }

  const inputPerMillionCents = numberFromEnv([
    "OPENAI_INPUT_COST_PER_1M_TOKENS_CENTS",
    "LLM_INPUT_COST_PER_1M_TOKENS_CENTS",
  ]);
  const outputPerMillionCents = numberFromEnv([
    "OPENAI_OUTPUT_COST_PER_1M_TOKENS_CENTS",
    "LLM_OUTPUT_COST_PER_1M_TOKENS_CENTS",
  ]);
  if (inputPerMillionCents === null && outputPerMillionCents === null) {
    return null;
  }

  const inputCost =
    ((usage.prompt_tokens || 0) * (inputPerMillionCents || 0)) / 1_000_000;
  const outputCost =
    ((usage.completion_tokens || 0) * (outputPerMillionCents || 0)) / 1_000_000;
  return Math.round(inputCost + outputCost);
}

type TrackedInvokeArgs = {
  params: InvokeParams;
  projectId: number;
  runId?: number | null;
  sheetId?: number | null;
  passType: TakeoffPassType;
  promptVersion?: string;
  detail?: "auto" | "low" | "high" | "original";
  retryAttempt?: number;
  metadata?: Record<string, unknown>;
};

export async function invokeTrackedTakeoffLLM({
  params,
  projectId,
  runId,
  sheetId,
  passType,
  promptVersion,
  detail,
  retryAttempt = 0,
  metadata,
}: TrackedInvokeArgs): Promise<InvokeResult> {
  const model = resolveTakeoffModelForPass(passType);
  const provider = resolveLLMProvider(model);
  const startedAt = new Date();
  const started = Date.now();
  const promptHash = hashPrompt(params);
  const timeoutMs = resolveTakeoffLlmTimeoutMs(passType);
  const attemptMetadata = {
    ...(metadata || {}),
    timeoutMs,
  };

  try {
    const response = await invokeLLMWithTimeout(
      { ...params, model },
      timeoutMs
    );
    const completedAt = new Date();
    const usage = response.usage;
    await createTakeoffLlmAttempt({
      projectId,
      runId: runId || null,
      sheetId: sheetId || null,
      passType,
      status: "success",
      model: response.model || model,
      provider,
      promptVersion: promptVersion || TAKEOFF_PROMPT_VERSIONS[passType],
      promptHash,
      detail: detail || null,
      retryAttempt,
      startedAt,
      completedAt,
      durationMs: Date.now() - started,
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      estimatedCostCents: estimateUsageCostCents(usage),
      metadata: attemptMetadata,
    } as any).catch(err => {
      console.warn("[Takeoff AI] Failed to record LLM attempt:", err);
    });
    return response;
  } catch (error: any) {
    const completedAt = new Date();
    await createTakeoffLlmAttempt({
      projectId,
      runId: runId || null,
      sheetId: sheetId || null,
      passType,
      status: "error",
      model,
      provider,
      promptVersion: promptVersion || TAKEOFF_PROMPT_VERSIONS[passType],
      promptHash,
      detail: detail || null,
      retryAttempt,
      startedAt,
      completedAt,
      durationMs: Date.now() - started,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostCents: null,
      errorMessage: error?.message || "Unknown LLM error",
      metadata: attemptMetadata,
    } as any).catch(err => {
      console.warn("[Takeoff AI] Failed to record errored LLM attempt:", err);
    });
    throw error;
  }
}
