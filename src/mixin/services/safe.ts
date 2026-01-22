import type { MixinClient } from "../client.js";

export const createSafeService = (client: MixinClient) => ({
  assets: () => client.safe.assets(),
});
