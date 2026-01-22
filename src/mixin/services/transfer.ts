import { getUuid } from "@mixin.dev/mixin-node-sdk";
import type { TransferResponse } from "@mixin.dev/mixin-node-sdk";
import type { MixinClient } from "../client.js";
import type { MixinConfig } from "../config.js";

export type TransferInput = {
  assetId: string;
  opponentId: string;
  amount: string;
  memo?: string;
};

const normalizeAmount = (amount: string) =>
  amount.trim().startsWith("-") ? amount.trim().slice(1) : amount.trim();

const requireSpendKey = (config: MixinConfig) => {
  if (!config.spend_private_key) {
    throw new Error("Missing spend_private_key in mixin-config.json.");
  }
  return config.spend_private_key;
};

const assertTransferSnapshot = (snapshot: unknown): TransferResponse => {
  if (!snapshot || typeof snapshot !== "object" || !("type" in snapshot)) {
    throw new Error("Snapshot not found.");
  }
  const typed = snapshot as TransferResponse;
  if (typed.type !== "transfer") {
    throw new Error("Refund only supports transfer snapshots.");
  }
  return typed;
};

export const createTransferService = (
  client: MixinClient,
  config: MixinConfig
) => ({
  toUser: (input: TransferInput) => {
    const spendKey = requireSpendKey(config);
    if (!input.assetId.trim() || !input.opponentId.trim() || !input.amount.trim()) {
      throw new Error("Asset ID, opponent ID, and amount are required.");
    }

    return client.transfer.toUser(spendKey, {
      asset_id: input.assetId.trim(),
      opponent_id: input.opponentId.trim(),
      amount: input.amount.trim(),
      trace_id: getUuid(),
      memo: input.memo?.trim() || undefined,
    });
  },
  refundSnapshot: async (snapshotId: string) => {
    const spendKey = requireSpendKey(config);
    if (!snapshotId.trim()) {
      throw new Error("Snapshot ID is required.");
    }
    const snapshot = await client.transfer.snapshot(snapshotId.trim());
    const transfer = assertTransferSnapshot(snapshot);
    const amount = normalizeAmount(transfer.amount);

    return client.transfer.toUser(spendKey, {
      asset_id: transfer.asset_id,
      opponent_id: transfer.opponent_id,
      amount,
      trace_id: getUuid(),
      memo: `refund:${transfer.snapshot_id}`,
    });
  },
});
