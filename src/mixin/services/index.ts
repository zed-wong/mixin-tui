import type { MixinClient } from "../client.js";
import type { MixinConfig } from "../config.js";
import { createWalletService } from "./wallet.js";
import { createTransferService } from "./transfer.js";
import { createUserService } from "./user.js";
import { createNetworkService } from "./network.js";
import { createSafeService } from "./safe.js";
import { createMessagesService } from "./messages.js";

export const createServices = (client: MixinClient, config: MixinConfig) => ({
  wallet: createWalletService(client),
  transfer: createTransferService(client, config),
  user: createUserService(client),
  network: createNetworkService(client),
  safe: createSafeService(client),
  messages: createMessagesService(client),
});

export type MixinServices = ReturnType<typeof createServices>;
