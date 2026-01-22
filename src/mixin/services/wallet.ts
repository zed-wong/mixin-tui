import BigNumber from "bignumber.js";
import type { SafeSnapshotsRequest } from "@mixin.dev/mixin-node-sdk";
import type { MixinClient } from "../client.js";

type BalanceRow = {
  assetId: string;
  symbol?: string;
  name?: string;
  balance: string;
  iconUrl?: string;
};

const sumAmounts = (amounts: string[]) =>
  amounts
    .reduce((acc, value) => acc.plus(value), new BigNumber(0))
    .toString();

const fetchAllSafeSnapshots = async (client: MixinClient) => {
  const limit = 200;
  let offset: string | undefined;
  const snapshots: Awaited<ReturnType<typeof client.safe.fetchSafeSnapshots>> = [];
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const batch = await client.safe.fetchSafeSnapshots({ limit, offset });
    if (batch.length === 0) {
      break;
    }
    snapshots.push(...batch);
    const last = batch[batch.length - 1];
    if (!last?.created_at || last.created_at === offset) {
      break;
    }
    offset = last.created_at;
    if (batch.length < limit) {
      break;
    }
  }
  return snapshots;
};

export const createWalletService = (client: MixinClient) => ({
  listBalances: async (): Promise<BalanceRow[]> => {
    const snapshots = await fetchAllSafeSnapshots(client);
    const amountMap = new Map<string, string[]>();
    for (const snapshot of snapshots) {
      const list = amountMap.get(snapshot.asset_id) ?? [];
      list.push(snapshot.amount);
      amountMap.set(snapshot.asset_id, list);
    }
    const assetIds = Array.from(amountMap.keys());
    const assets = assetIds.length > 0 ? await client.safe.fetchAssets(assetIds) : [];
    const assetMap = new Map(assets.map((asset) => [asset.asset_id, asset]));
    return Array.from(amountMap.entries()).map(([assetId, amounts]) => {
      const asset = assetMap.get(assetId);
      return {
        assetId,
        symbol: asset?.symbol,
        name: asset?.name,
        balance: sumAmounts(amounts),
        iconUrl: asset?.icon_url,
      };
    });
  },
  assetDetail: (assetId: string) => {
    if (!assetId.trim()) {
      throw new Error("Asset ID is required.");
    }
    return client.asset.fetch(assetId.trim());
  },
  listSnapshots: (params: SafeSnapshotsRequest) =>
    client.safe.fetchSafeSnapshots(params),
  snapshotDetail: (snapshotId: string) => {
    if (!snapshotId.trim()) {
      throw new Error("Snapshot ID is required.");
    }
    return client.safe.fetchSafeSnapshot(snapshotId.trim());
  },
});
