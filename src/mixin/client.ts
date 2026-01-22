import { MixinApi } from "@mixin.dev/mixin-node-sdk";
import type { AppKeystore } from "@mixin.dev/mixin-node-sdk";
import type { MixinConfig } from "./config.js";

export const createMixinClient = (config: MixinConfig) => {
  const keystore: AppKeystore = {
    app_id: config.app_id,
    session_id: config.session_id,
    server_public_key: config.server_public_key,
    session_private_key: config.session_private_key,
  };

  return MixinApi({
    keystore,
    blazeOptions: {
      parse: true,
      syncAck: false,
    },
  });
};

export type MixinClient = ReturnType<typeof createMixinClient>;
