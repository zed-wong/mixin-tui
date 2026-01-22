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
  startStream: (handler: BlazeHandler) => {
    try {
      client.blaze.loop(handler);
    } catch (error) {
      if (error instanceof Error && error.message === "Blaze is already running") {
        client.blaze.stopLoop();
        client.blaze.loop(handler);
      } else {
        throw error;
      }
    }
  },
  stopStream: () => client.blaze.stopLoop(),
});
