import type { SafeSnapshotsRequest } from "@mixin.dev/mixin-node-sdk";
import type { MixinClient } from "../client.js";

const fetchAllSafeSnapshots = async (
  client: MixinClient,
  params: SafeSnapshotsRequest
) => {
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 200);
  let offset = params.offset;
  const snapshots: Awaited<ReturnType<typeof client.safe.fetchSafeSnapshots>> = [];
  let guard = 0;
  const maxPages = 100;

  while (guard < maxPages) {
    guard += 1;
    const batch = await client.safe.fetchSafeSnapshots({
      ...params,
      limit,
      offset,
    });
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

  const sorted = snapshots
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return sorted;
};

export const createSafeService = (client: MixinClient) => ({
  assets: () => client.safe.assets(),
  listSnapshots: (params: SafeSnapshotsRequest) =>
    client.safe.fetchSafeSnapshots(params),
  listSnapshotsWithAssets: async (params: SafeSnapshotsRequest) => {
    const snapshots = await fetchAllSafeSnapshots(client, params);
    const assetIds = Array.from(
      new Set(snapshots.map((snapshot) => snapshot.asset_id))
    );
    const assets = assetIds.length > 0 ? await client.safe.fetchAssets(assetIds) : [];
    const assetMap = new Map(assets.map((asset) => [asset.asset_id, asset]));
    return snapshots.map((snapshot) => {
      const asset = assetMap.get(snapshot.asset_id);
      return {
        ...snapshot,
        asset_symbol: asset?.symbol,
        asset_name: asset?.name,
      };
    });
  },
  snapshotDetail: (snapshotId: string) => {
    if (!snapshotId.trim()) {
      throw new Error("Snapshot ID is required.");
    }
    return client.safe.fetchSafeSnapshot(snapshotId.trim());
  },
});
