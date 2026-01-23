import { readFile } from "node:fs/promises";

export type MixinConfig = {
  app_id: string;
  session_id: string;
  server_public_key: string;
  session_private_key: string;
  spend_private_key?: string;
  oauth_client_secret?: string;
};

const requiredKeys: Array<keyof MixinConfig> = [
  "app_id",
  "session_id",
  "server_public_key",
  "session_private_key",
];

export const parseConfig = (raw: string, source?: string): MixinConfig => {
  let parsed: Partial<MixinConfig>;
  try {
    parsed = JSON.parse(raw) as Partial<MixinConfig>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON${source ? ` in ${source}` : ""}: ${message}`);
  }

  const missing = requiredKeys.filter((key) => !parsed[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing config values: ${missing.join(", ")}.${source ? ` Check ${source}.` : ""}`
    );
  }

  return {
    ...parsed,
  } as MixinConfig;
};

export const loadConfig = async (configPath: string): Promise<MixinConfig> => {
  const raw = await readFile(configPath, "utf-8");
  return parseConfig(raw, configPath);
};
