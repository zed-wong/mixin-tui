import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto";
import type { MixinConfig } from "../config.js";

type AuthTokenInput = {
  method?: string;
  uri: string;
  body?: string;
  exp?: string;
};

const base64UrlEncode = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const normalizeMethod = (value?: string) => {
  const method = (value ?? "GET").trim().toUpperCase();
  return method.length > 0 ? method : "GET";
};

const normalizeUri = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("URI is required.");
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const parseDurationSeconds = (value?: string) => {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return 3600;
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    if (seconds <= 0) {
      throw new Error("Expiration must be greater than zero.");
    }
    return seconds;
  }
  const match = trimmed.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error("Expiration must be a number or duration like 10m, 1h, 2d.");
  }
  const amount = Number.parseInt(match[1], 10);
  if (amount <= 0) {
    throw new Error("Expiration must be greater than zero.");
  }
  const unit = match[2];
  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return amount * multiplier;
};

const buildEd25519PrivateKey = (privateKeyHex: string) => {
  const trimmed = privateKeyHex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error("Session private key must be a 32-byte hex string.");
  }
  const seed = Buffer.from(trimmed, "hex");
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  return createPrivateKey({ key: Buffer.concat([prefix, seed]), format: "der", type: "pkcs8" });
};

export const createAuthService = (config: MixinConfig) => ({
  signAuthToken: async ({ method, uri, body, exp }: AuthTokenInput) => {
    const normalizedMethod = normalizeMethod(method);
    const normalizedUri = normalizeUri(uri);
    const data = body ?? "";
    const iat = Math.floor(Date.now() / 1000);
    const expSeconds = parseDurationSeconds(exp);
    const requestId = randomUUID();
    const signature = createHash("sha256")
      .update(normalizedMethod + normalizedUri + data)
      .digest("hex");

    const payload = {
      uid: config.app_id,
      sid: config.session_id,
      iat,
      exp: iat + expSeconds,
      jti: requestId,
      sig: signature,
      scp: "FULL",
    };

    const header = { alg: "EdDSA", typ: "JWT" };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const key = buildEd25519PrivateKey(config.session_private_key);
    const signed = sign(null, Buffer.from(signingInput), key);
    const token = `${signingInput}.${base64UrlEncode(signed)}`;

    return {
      token,
      request_id: requestId,
      payload,
      issued_at: new Date(iat * 1000).toISOString(),
      expires_at: new Date((iat + expSeconds) * 1000).toISOString(),
    };
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
