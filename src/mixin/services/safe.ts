import type { SafeSnapshotsRequest } from "@mixin.dev/mixin-node-sdk";
import type { MixinClient } from "../client.js";

export const createSafeService = (client: MixinClient) => ({
  assets: () => client.safe.assets(),
  listSnapshots: (params: SafeSnapshotsRequest) =>
    client.safe.fetchSafeSnapshots(params),
  listSnapshotsWithAssets: async (params: SafeSnapshotsRequest) => {
    const snapshots = await client.safe.fetchSafeSnapshots(params);
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
