import type { MixinClient } from "../client.js";

export const createUserService = (client: MixinClient) => ({
  profile: () => client.user.profile(),
  fetch: (userId: string) => {
    if (!userId.trim()) {
      throw new Error("User ID is required.");
    }
    return client.user.fetch(userId.trim());
  },
});
