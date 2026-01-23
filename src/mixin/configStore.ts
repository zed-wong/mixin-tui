import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadConfig, parseConfig, type MixinConfig } from "./config.js";

export type StoredConfigEntry = {
  label: string;
  path: string;
};

const CONFIG_DIR = path.join(os.homedir(), ".mixin-tui", "configs");

const sanitizeLabel = (label: string) => {
  const trimmed = label.trim();
  const base = trimmed || "config";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "config";
};

const resolveUniqueLabel = (existing: Set<string>, label: string) => {
  if (!existing.has(label)) return label;
  let counter = 1;
  while (existing.has(`${label}-${counter}`)) {
    counter += 1;
  }
  return `${label}-${counter}`;
};

export const ensureConfigDir = async () => {
  await mkdir(CONFIG_DIR, { recursive: true });
  return CONFIG_DIR;
};

export const listStoredConfigs = async (): Promise<StoredConfigEntry[]> => {
  const dir = await ensureConfigDir();
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const label = path.basename(entry.name, ".json");
      return { label, path: path.join(dir, entry.name) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
};

const resolveTargetLabel = async (label: string) => {
  const dir = await ensureConfigDir();
  const entries = await readdir(dir, { withFileTypes: true });
  const existing = new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.basename(entry.name, ".json"))
  );
  const sanitized = sanitizeLabel(label);
  return resolveUniqueLabel(existing, sanitized);
};

export const saveStoredConfigFromPath = async (options: {
  label?: string;
  sourcePath: string;
}): Promise<StoredConfigEntry> => {
  const config = await loadConfig(options.sourcePath);
  const baseLabel = options.label?.trim() || path.basename(options.sourcePath, ".json");
  const safeLabel = await resolveTargetLabel(baseLabel);
  const targetPath = path.join(CONFIG_DIR, `${safeLabel}.json`);
  await writeFile(targetPath, JSON.stringify(config, null, 2), "utf-8");
  return { label: safeLabel, path: targetPath };
};

export const saveStoredConfigFromJson = async (options: {
  label: string;
  rawJson: string;
}): Promise<StoredConfigEntry> => {
  const config = parseConfig(options.rawJson, "pasted JSON");
  const safeLabel = sanitizeLabel(options.label);
  if (!safeLabel) {
    throw new Error("Bot ID is required.");
  }
  await ensureConfigDir();
  const targetPath = path.join(CONFIG_DIR, `${safeLabel}.json`);
  await writeFile(targetPath, JSON.stringify(config, null, 2), "utf-8");
  return { label: safeLabel, path: targetPath };
};

export const removeStoredConfig = async (label: string) => {
  const safeLabel = sanitizeLabel(label);
  if (!safeLabel) {
    throw new Error("Bot ID is required.");
  }
  await ensureConfigDir();
  const targetPath = path.join(CONFIG_DIR, `${safeLabel}.json`);
  await unlink(targetPath);
  return { label: safeLabel, path: targetPath };
};

export const loadStoredConfigByLabel = async (label: string): Promise<{
  config: MixinConfig;
  path: string;
}> => {
  const safeLabel = sanitizeLabel(label);
  if (!safeLabel) {
    throw new Error("Bot ID is required.");
  }
  await ensureConfigDir();
  const targetPath = path.join(CONFIG_DIR, `${safeLabel}.json`);
  const raw = await readFile(targetPath, "utf-8");
  const config = parseConfig(raw, targetPath);
  return { config, path: targetPath };
};
