import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_PDF =
  "/Users/marshallwilkinson/Downloads/Project Drawings/CRYSTAL CARWASH PLANS - PERMIT SET 12_17_25.pdf";

const DEFAULT_OUTPUT_DIR = path.join(repoRoot, "outputs");
const DEFAULT_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const DEFAULT_MODEL = "sonar-pro";

const SONAR_PRICING_USD_PER_MILLION = {
  sonar: { input: 1, output: 1 },
  "sonar-pro": { input: 3, output: 15 },
  "sonar-reasoning-pro": { input: 2, output: 8 },
  "sonar-deep-research": { input: 2, output: 8 },
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnv() {
  const explicit = process.env.PERPLEXITY_ENV_FILE;
  const candidates = explicit
    ? [explicit]
    : [
        path.join(repoRoot, ".env.local"),
        path.join(repoRoot, ".env"),
        path.join(process.cwd(), ".env.local"),
        path.join(process.cwd(), ".env"),
      ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }
}

function getArgValue(name, fallback) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function sanitizeOutputText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function buildProbePrompt() {
  return [
    "You are benchmarking a construction estimating assistant for ConstructLine Basis.",
    "Read the attached permit drawing PDF and return a concise, source-grounded JSON object only.",
    "Do not perform a full estimate in this probe. Do not invent quantities.",
    "Focus on whether the model can identify the project, sheet index, missing trade coverage, and estimate risks.",
    "",
    "Return JSON with this shape:",
    "{",
    '  "project": { "name": string, "location": string|null, "permitSetDate": string|null, "buildingSquareFeet": number|null },',
    '  "drawingSet": { "sheetCountObserved": number|null, "disciplines": string[], "keySheets": [{"sheet": string, "title": string, "whyImportant": string}] },',
    '  "estimateReadiness": { "canProceedToDraftEstimate": boolean, "riskLevel": "low"|"medium"|"high", "missingInformation": string[] },',
    '  "highValueRisks": [{"scope": string, "whyItMatters": string, "estimatorAction": string}],',
    '  "benchmarkOpinion": { "usefulForConstructLine": boolean, "why": string }',
    "}",
  ].join("\n");
}

function buildEstimatePrompt() {
  return [
    "You are benchmarking a construction estimating assistant for ConstructLine Basis.",
    "Read the attached permit drawing PDF and produce a draft construction estimate suitable for estimator review.",
    "This is a heavy-lift draft, not a final bid. Be conservative: clearly label allowances, assumptions, and items that need estimator review.",
    "Use CSI divisions. Avoid duplicate scope. Exclude permit, tap, impact, utility company, and owner-direct equipment costs unless explicitly shown.",
    "For car wash equipment, use an allowance only if the drawings do not provide vendor equipment pricing.",
    "",
    "Return JSON only with this shape:",
    "{",
    '  "summary": { "projectName": string, "location": string|null, "buildingSquareFeet": number|null, "directCost": number, "grandTotal": number, "costPerSf": number|null },',
    '  "markups": { "generalConditionsPct": number, "overheadPct": number, "profitPct": number, "contingencyPct": number, "bondPct": number },',
    '  "divisions": [{"division": string, "name": string, "subtotal": number, "scopeNotes": string[], "lineItems": [{"description": string, "quantity": number|null, "unit": string|null, "unitCost": number|null, "total": number|null, "basis": string, "confidence": number}]}],',
    '  "exclusions": string[],',
    '  "estimatorReview": [{"issue": string, "valueAtStake": number|null, "recommendedAction": string}],',
    '  "benchmarkOpinion": { "usefulForConstructLine": boolean, "why": string }',
    "}",
  ].join("\n");
}

function getPricing(model) {
  const explicitInput = Number(process.env.PERPLEXITY_INPUT_PER_MILLION_USD);
  const explicitOutput = Number(process.env.PERPLEXITY_OUTPUT_PER_MILLION_USD);
  if (Number.isFinite(explicitInput) && Number.isFinite(explicitOutput)) {
    return { input: explicitInput, output: explicitOutput, source: "env" };
  }

  const key = model.replace(/^perplexity\//, "");
  const pricing = SONAR_PRICING_USD_PER_MILLION[key];
  return pricing ? { ...pricing, source: "sonar-pricing-table" } : null;
}

function estimateCost({ model, usage }) {
  if (!usage) return null;

  const promptTokens =
    usage.prompt_tokens ??
    usage.input_tokens ??
    usage.total_prompt_tokens ??
    usage.total_input_tokens ??
    0;
  const completionTokens =
    usage.completion_tokens ??
    usage.output_tokens ??
    usage.total_completion_tokens ??
    usage.total_output_tokens ??
    0;

  const actualUsd =
    typeof usage.cost?.total_cost === "number" ? usage.cost.total_cost : null;
  const pricing = getPricing(model);
  if (!pricing) return { promptTokens, completionTokens, estimatedUsd: null };

  const estimatedUsd =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;

  return {
    promptTokens,
    completionTokens,
    actualUsd,
    pricing,
    estimatedUsd: Number(estimatedUsd.toFixed(4)),
  };
}

function extractContent(responseJson) {
  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => (part?.type === "text" ? part.text : JSON.stringify(part)))
      .join("\n");
  }
  return "";
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.PPLX_API_KEY;
  if (!apiKey) {
    console.error(
      [
        "Missing PERPLEXITY_API_KEY.",
        "",
        "Safe setup options:",
        "1. Add PERPLEXITY_API_KEY=... to .env.local in this repo, or",
        "2. Run PERPLEXITY_API_KEY='...' node scripts/perplexity-crystal-benchmark.mjs",
        "",
        "Do not paste the key into chat.",
      ].join("\n")
    );
    process.exit(1);
  }

  const mode = getArgValue(
    "--mode",
    hasFlag("--estimate") ? "estimate" : "probe"
  );
  const model = getArgValue(
    "--model",
    process.env.PERPLEXITY_MODEL || DEFAULT_MODEL
  );
  const endpoint = process.env.PERPLEXITY_ENDPOINT || DEFAULT_ENDPOINT;
  const pdfPath = getArgValue(
    "--pdf",
    process.env.CRYSTAL_PDF_PATH || DEFAULT_PDF
  );
  const outputDir = getArgValue("--output-dir", DEFAULT_OUTPUT_DIR);
  const maxTokens = Number(
    getArgValue("--max-tokens", mode === "estimate" ? "8000" : "2200")
  );

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfMb = pdfBytes.length / 1024 / 1024;
  if (pdfMb > 50) {
    throw new Error(
      `PDF is ${pdfMb.toFixed(1)} MB. Perplexity media limit is 50 MB.`
    );
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const prompt =
    mode === "estimate" ? buildEstimatePrompt() : buildProbePrompt();
  const startedAt = Date.now();
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file_url",
            file_url: {
              url: pdfBytes.toString("base64"),
              mime_type: "application/pdf",
            },
          },
        ],
      },
    ],
    max_tokens: maxTokens,
  };

  console.log(
    `Calling ${endpoint} with ${model} (${mode}) using ${path.basename(pdfPath)} (${pdfMb.toFixed(1)} MB)...`
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const elapsedMs = Date.now() - startedAt;
  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = { rawText: responseText };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `perplexity-crystal-${mode}-${timestamp}`;
  const rawPath = path.join(outputDir, `${baseName}.json`);
  const textPath = path.join(outputDir, `${baseName}.txt`);

  const content = sanitizeOutputText(extractContent(responseJson));
  const cost = estimateCost({ model, usage: responseJson?.usage });
  const saved = {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    endpoint,
    model,
    mode,
    pdfPath,
    pdfBytes: pdfBytes.length,
    elapsedMs,
    cost,
    response: responseJson,
  };

  fs.writeFileSync(rawPath, JSON.stringify(saved, null, 2));
  fs.writeFileSync(textPath, content || responseText);

  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);
  if (cost) {
    console.log(
      `Usage: ${cost.promptTokens} input / ${cost.completionTokens} output tokens`
    );
    if (cost.estimatedUsd !== null) {
      console.log(`Estimated model cost: $${cost.estimatedUsd}`);
    }
    if (cost.actualUsd !== null && cost.actualUsd !== undefined) {
      console.log(`Reported API cost: $${cost.actualUsd}`);
    }
  }
  console.log(`Saved raw response: ${rawPath}`);
  console.log(`Saved text response: ${textPath}`);

  if (!response.ok) {
    console.error(responseText.slice(0, 2000));
    process.exit(1);
  }

  console.log("\n--- Response preview ---");
  console.log((content || responseText).slice(0, 4000));
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
