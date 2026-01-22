import {
  buildSafeTransaction,
  buildSafeTransactionRecipient,
  encodeSafeTransaction,
  getUnspentOutputsForRecipients,
  getUuid,
  signSafeTransaction,
} from "@mixin.dev/mixin-node-sdk";
import type { SafeSnapshot } from "@mixin.dev/mixin-node-sdk";
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

const assertTransferSnapshot = (snapshot: unknown): SafeSnapshot => {
  if (!snapshot || typeof snapshot !== "object" || !("type" in snapshot)) {
    throw new Error("Snapshot not found.");
  }
  const typed = snapshot as SafeSnapshot;
  if (typed.type !== "snapshot") {
    throw new Error("Snapshot type error");
  }
  return typed;
};

const sendSafeTransfer = async (
  client: MixinClient,
  spendKey: string,
  input: TransferInput
) => {
  const assetId = input.assetId.trim();
  const opponentId = input.opponentId.trim();
  const amount = input.amount.trim();
  if (!assetId || !opponentId || !amount) {
    throw new Error("Asset ID, opponent ID, and amount are required.");
  }

  const recipients = [buildSafeTransactionRecipient([opponentId], 1, amount)];
  const outputs = await client.utxo.safeOutputs({
    asset: assetId,
    state: "unspent",
  });

  const { utxos, change } = getUnspentOutputsForRecipients(outputs, recipients);
  if (!change.isZero() && !change.isNegative()) {
    const changeMembers = outputs[0]?.receivers ?? [];
    const changeThreshold = outputs[0]?.receivers_threshold ?? 1;
    recipients.push(
      buildSafeTransactionRecipient(changeMembers, changeThreshold, change.toString())
    );
  }

  const requestId = getUuid();
  const ghostKeys = await client.utxo.ghostKey(recipients, requestId, spendKey);
  const extra = Buffer.from(input.memo?.trim() ?? "");
  const tx = buildSafeTransaction(utxos, recipients, ghostKeys, extra);
  const raw = encodeSafeTransaction(tx);

  const verified = await client.utxo.verifyTransaction([
    {
      raw,
      request_id: requestId,
    },
  ]);

  const signedRaw = signSafeTransaction(tx, verified[0].views, spendKey);
  return client.utxo.sendTransactions([
    {
      raw: signedRaw,
      request_id: requestId,
    },
  ]);
};

export const createTransferService = (
  client: MixinClient,
  config: MixinConfig
) => ({
  toUser: (input: TransferInput) => {
    const spendKey = requireSpendKey(config);
    return sendSafeTransfer(client, spendKey, input);
  },
  refundSnapshot: async (snapshotId: string) => {
    const spendKey = requireSpendKey(config);
    if (!snapshotId.trim()) {
      throw new Error("Snapshot ID is required.");
    }
    const snapshot = await client.safe.fetchSafeSnapshot(snapshotId.trim());
    const transfer = assertTransferSnapshot(snapshot);
    const amount = normalizeAmount(transfer.amount);
    return sendSafeTransfer(client, spendKey, {
      assetId: transfer.asset_id,
      opponentId: transfer.opponent_id,
      amount,
      memo: `refund:${transfer.snapshot_id}`,
    });
  },
});
