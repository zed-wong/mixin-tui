import type { BlazeHandler } from "@mixin.dev/mixin-node-sdk";
import type { MixinClient } from "../client.js";

export const createMessagesService = (client: MixinClient) => ({
  sendText: (userId: string, text: string) => {
    if (!userId.trim()) {
      throw new Error("User ID is required.");
    }
    if (!text.trim()) {
      throw new Error("Message text is required.");
    }
    return client.message.sendText(userId.trim(), text.trim());
  },
  startStream: (handler: BlazeHandler) => client.blaze.loop(handler),
  stopStream: () => client.blaze.stopLoop(),
});
