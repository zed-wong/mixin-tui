import type { MixinClient } from "../client.js";

export const createUserService = (client: MixinClient) => ({
  profile: () => client.user.profile(),
  fetch: (id: string) => {
    if (!id.trim()) {
      throw new Error("User ID or Mixin ID is required.");
    }
    const query = id.trim();
    // Simple heuristic: UUID has hyphens or is 36 chars. Mixin ID is number-like.
    // However, fetch() accepts user_id. search() accepts mixin_id.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query
      );

    if (isUuid) {
      return client.user.fetch(query);
    }
    return client.user.search(query);
  },
});
