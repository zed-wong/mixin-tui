import type { MixinClient } from "../client.js";

export const createNetworkService = (client: MixinClient) => ({
  topAssets: () => client.network.topAssets(),
});
