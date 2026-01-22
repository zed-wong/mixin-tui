const decodeExtra = (extra?: string) => {
  if (!extra) return "";
  const normalized = extra.trim();
  if (/^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    try {
      return Buffer.from(normalized, "hex").toString();
    } catch {
      return normalized;
    }
  }
  return normalized;
};

export const buildTxSummary = (entry: Record<string, unknown>, opponentId?: string) => {
  const createdAt = String(entry.created_at ?? "");
  const requestId = String(entry.request_id ?? "");
  const snapshotId = String(entry.snapshot_id ?? "");
  const transactionHash = String(entry.transaction_hash ?? "");
  const memo = decodeExtra(typeof entry.extra === "string" ? entry.extra : undefined);
  const receivers = Array.isArray(entry.receivers)
    ? entry.receivers.map(String).join(", ")
    : "";
  const opponent = opponentId || receivers;
  const link = transactionHash ? `https://mixin.space/tx/${transactionHash}` : "";

  return [
    `opponent_id: ${opponent}`,
    `trace_id: ${requestId}`,
    `snapshot_id: ${snapshotId}`,
    `created_at: ${createdAt}`,
    `memo: ${memo}`,
    `tx: ${link}`,
  ];
};
