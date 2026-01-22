import type { MixinClient } from "../client.js";

export const createNetworkService = (client: MixinClient) => ({
  topAssets: () => client.network.topAssets(),
  fetchAsset: (assetId: string) => {
    if (!assetId.trim()) {
      throw new Error("Asset ID is required.");
    }
    return client.network.fetchAsset(assetId.trim());
  },
  searchAssets: (keyword: string, kind?: string) =>
    client.network.searchAssets(keyword, kind),
});
