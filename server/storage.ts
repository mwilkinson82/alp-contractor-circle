// Storage helpers for ConstructLine uploads.
// Supports the legacy Manus/Forge storage proxy and a local mounted storage mode
// for standalone hosts like Railway.

import fs from "fs/promises";
import path from "path";
import express, { type Express } from "express";
import { ENV } from './_core/env';
import { RUNTIME_FLAGS } from "./_core/runtimeFlags";

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageProvider() {
  return (process.env.STORAGE_PROVIDER || "forge").trim().toLowerCase();
}

function getLocalStorageDir(): string {
  const configured = process.env.STORAGE_LOCAL_DIR?.trim();
  if (configured) return path.resolve(configured);

  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (volumePath) return path.join(volumePath, "storage");

  return path.join(process.cwd(), "data", "storage");
}

function getPublicUploadsBaseUrl(): string {
  const origin = RUNTIME_FLAGS.publicAppOrigin || "";
  return origin ? `${origin}/uploads` : "/uploads";
}

function encodeKeyPath(key: string): string {
  return key
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");
}

function decodeKeyPath(keyPath: string): string {
  return keyPath
    .split("/")
    .map(part => decodeURIComponent(part))
    .join("/");
}

function guessContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function localUploadUrlToKey(urlOrKey: string): string | null {
  const rawValue = urlOrKey.trim();
  if (!rawValue || rawValue.startsWith("data:")) return null;

  let pathname = rawValue;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawValue)) {
    try {
      pathname = new URL(rawValue).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith("/uploads/")) return null;
  return normalizeKey(decodeKeyPath(pathname.slice("/uploads/".length)));
}

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (getStorageProvider() === "local") {
    const key = normalizeKey(relKey);
    const storageDir = getLocalStorageDir();
    const destination = path.join(storageDir, key);
    const relative = path.relative(storageDir, destination);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Invalid storage key");
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, data);

    return {
      key,
      url: `${getPublicUploadsBaseUrl()}/${encodeKeyPath(key)}`,
    };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  if (getStorageProvider() === "local") {
    const key = normalizeKey(relKey);
    return {
      key,
      url: `${getPublicUploadsBaseUrl()}/${encodeKeyPath(key)}`,
    };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

export async function storageUrlToDataUrl(urlOrKey: string): Promise<string | null> {
  if (getStorageProvider() !== "local") return null;

  const key = localUploadUrlToKey(urlOrKey);
  if (!key) return null;

  const storageDir = getLocalStorageDir();
  const source = path.join(storageDir, key);
  const relative = path.relative(storageDir, source);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage key");
  }

  const data = await fs.readFile(source);
  const contentType = guessContentType(key);
  return `data:${contentType};base64,${data.toString("base64")}`;
}

export function registerLocalStorageRoutes(app: Express) {
  if (getStorageProvider() !== "local") return;

  const storageDir = getLocalStorageDir();
  app.use(
    "/uploads",
    express.static(storageDir, {
      fallthrough: false,
      maxAge: "1d",
    })
  );
  console.log(`[Storage] Serving local uploads from ${storageDir}`);
}
