import type { BlazeHandler } from "@mixin.dev/mixin-node-sdk";
import type { MessageRequest } from "@mixin.dev/mixin-node-sdk";
import { randomUUID } from "node:crypto";
import type { MixinClient } from "../client.js";
import { createMessagesDb, type MessageRecord } from "../../storage/messagesDb.js";

type MessageServiceOptions = {
  db?: ReturnType<typeof createMessagesDb>;
  dbPath?: string;
  appId?: string;
};

type CreateGroupInput = {
  name: string;
  participantIds: string[];
};

type WithdrawInput = {
  conversationId: string;
  messageId: string;
};

type StreamOptions = {
  conversationId?: string;
  onMessage?: (message: MessageRecord) => void;
  onRecall?: (messageId: string) => void;
  onConversation?: (conversationId: string) => void;
};

const base64RawUrlEncode = (value: string | Uint8Array | Buffer) => {
  const buf = typeof value === "string" ? Buffer.from(value) : Buffer.from(value);
  if (buf.length === 0) return "";
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const normalizeParticipantIds = (participants: string[]) =>
  Array.from(
    new Set(
      participants
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );

const decodeMessageContent = (message: any) => {
  const payload = message?.data;
  if (message?.category === "PLAIN_TEXT") {
    if (typeof payload === "string") return payload;
    if (payload instanceof Uint8Array) return Buffer.from(payload).toString();
    if (Array.isArray(payload) && payload.every((value: unknown) => typeof value === "number")) {
      return Buffer.from(payload).toString();
    }
    if (
      payload &&
      typeof payload === "object" &&
      "type" in payload &&
      (payload as { type?: string }).type === "Buffer" &&
      "data" in payload &&
      Array.isArray((payload as { data?: unknown }).data)
    ) {
      return Buffer.from((payload as { data: number[] }).data).toString();
    }
    return JSON.stringify(payload ?? "");
  }
  if (message?.category === "SYSTEM_ACCOUNT_SNAPSHOT") {
    const data = payload ?? {};
    const amount = data.amount || "?";
    const symbol = data.asset?.symbol || "Asset";
    return `Transfer: ${amount} ${symbol}`;
  }
  return `[${message?.category ?? "UNKNOWN"}]`;
};

const decodeJsonPayload = (payload: any) => {
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (payload instanceof Uint8Array) {
    try {
      return JSON.parse(Buffer.from(payload).toString());
    } catch {
      return null;
    }
  }
  if (
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    (payload as { type?: string }).type === "Buffer" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    try {
      return JSON.parse(Buffer.from((payload as { data: number[] }).data).toString());
    } catch {
      return null;
    }
  }
  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return null;
};

const extractParticipants = (payload: any) => {
  const participants = payload?.participants ?? payload?.participant_sessions;
  if (!Array.isArray(participants)) return [];
  return participants
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "user_id" in entry) {
        return String((entry as { user_id?: string }).user_id ?? "");
      }
      return "";
    })
    .map((value) => value.trim())
    .filter(Boolean);
};

const parseRecallMessageId = (message: any) => {
  const payload = message?.data;
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return parsed?.message_id ?? null;
    } catch {
      return null;
    }
  }
  if (payload instanceof Uint8Array) {
    try {
      const parsed = JSON.parse(Buffer.from(payload).toString());
      return parsed?.message_id ?? null;
    } catch {
      return null;
    }
  }
  if (typeof payload === "object" && "message_id" in payload) {
    return (payload as { message_id?: string }).message_id ?? null;
  }
  return null;
};

const startBlazeLoop = (client: MixinClient, handler: BlazeHandler) => {
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
};

export const createMessagesService = (
  client: MixinClient,
  options: MessageServiceOptions = {}
) => {
  const db = options.db ?? createMessagesDb({ path: options.dbPath });
  const appId = options.appId;

  const sendText = (userId: string, text: string) => {
    if (!userId.trim()) {
      throw new Error("User ID is required.");
    }
    if (!text.trim()) {
      throw new Error("Message text is required.");
    }
    return client.message.sendText(userId.trim(), text.trim());
  };

  const createGroupConversation = async ({
    name,
    participantIds,
  }: CreateGroupInput) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Group name is required.");
    }
    const participants = normalizeParticipantIds(participantIds);
    if (participants.length === 0) {
      throw new Error("At least one participant is required.");
    }
    const conversationId = randomUUID();
    const response = await client.conversation.createGroup(
      conversationId,
      trimmedName,
      participants.map((userId) => ({ user_id: userId }))
    );
    const createdAt = response.created_at ?? new Date().toISOString();
    const participantList = response.participant_sessions
      ? response.participant_sessions.map((participant) => participant.user_id)
      : participants;
    db.upsertConversation({
      conversationId: response.conversation_id ?? conversationId,
      name: response.name ?? trimmedName,
      category: response.category ?? "GROUP",
      participants: participantList,
      createdAt,
      updatedAt: createdAt,
    });
    return response;
  };

  const listLocalConversations = () => db.listConversations();

  const listLocalMessages = (conversationId: string) =>
    db.listMessages(conversationId);

  const listRecentMessages = (limit?: number) => db.listRecentMessages(limit);

  const getSetting = (key: string) => db.getSetting(key);
  const setSetting = (key: string, value: string) => db.setSetting(key, value);

  const getBackgroundBlazeEnabled = () => {
    const stored = db.getSetting("backgroundBlazeEnabled");
    if (stored === null) return true;
    return stored === "true";
  };

  const setBackgroundBlazeEnabled = (enabled: boolean) => {
    db.setSetting("backgroundBlazeEnabled", enabled ? "true" : "false");
  };

  const sendConversationText = async (conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!conversationId.trim()) {
      throw new Error("Conversation ID is required.");
    }
    if (!trimmed) {
      throw new Error("Message text is required.");
    }
    const messageId = randomUUID();
    const message: MessageRequest = {
      conversation_id: conversationId.trim(),
      message_id: messageId,
      category: "PLAIN_TEXT",
      data_base64: base64RawUrlEncode(trimmed),
    };
    await client.message.sendOne(message);
    db.addMessage({
      messageId,
      conversationId: conversationId.trim(),
      userId: appId ?? "",
      category: "PLAIN_TEXT",
      content: trimmed,
      createdAt: new Date().toISOString(),
      direction: "outgoing",
      status: "sent",
    });
    return message;
  };

  const withdrawMessage = async ({ conversationId, messageId }: WithdrawInput) => {
    if (!conversationId.trim()) {
      throw new Error("Conversation ID is required.");
    }
    if (!messageId.trim()) {
      throw new Error("Message ID is required.");
    }
    const recallMessage: MessageRequest = {
      conversation_id: conversationId.trim(),
      message_id: randomUUID(),
      category: "MESSAGE_RECALL",
      data_base64: base64RawUrlEncode(
        JSON.stringify({ message_id: messageId.trim() })
      ),
    };
    await client.message.sendOne(recallMessage);
    db.markMessageWithdrawn(messageId.trim());
  };

  const startStream = (handler: BlazeHandler) => {
    startBlazeLoop(client, handler);
  };

  const handleSystemConversation = async (message: any) => {
    const msgConversationId = message?.conversation_id?.trim();
    if (!msgConversationId) return;
    const payload = decodeJsonPayload(message?.data);
    const existing = db.getConversation(msgConversationId);
    let participants = payload ? extractParticipants(payload) : [];
    let name =
      (payload && typeof payload.name === "string" && payload.name) ||
      existing?.name ||
      "Group";
    let category =
      (payload && typeof payload.category === "string" && payload.category) ||
      existing?.category ||
      "GROUP";
    let createdAt =
      (payload && typeof payload.created_at === "string" && payload.created_at) ||
      existing?.createdAt ||
      message?.created_at ||
      new Date().toISOString();

    if (!payload || !payload.name) {
      try {
        const response = await client.conversation.fetch(msgConversationId);
        name = response.name || name;
        category = response.category || category;
        createdAt = response.created_at || createdAt;
        if (response.participant_sessions) {
          participants = response.participant_sessions.map((p) => p.user_id);
        }
      } catch {
        // ignore fetch errors
      }
    }

    db.upsertConversation({
      conversationId: msgConversationId,
      name,
      category,
      participants:
        participants.length > 0
          ? participants
          : existing?.participants ?? [],
      createdAt,
      updatedAt: message?.created_at ?? createdAt,
    });
  };

  const acknowledge = (message: any) => {
    if (!message?.message_id) return;
    void client.message.sendAcknowledgement({
      message_id: message.message_id,
      status: "READ",
    });
  };

  const startConversationStream = ({
    conversationId,
    onMessage,
    onRecall,
    onConversation,
  }: StreamOptions) => {
    startBlazeLoop(client, {
      onConversation: async (message: any) => {
        await handleSystemConversation(message);
        onConversation?.(message?.conversation_id ?? "");
        acknowledge(message);
      },
      onMessage: (message: any) => {
        const msgConversationId = message?.conversation_id?.trim();
        if (!msgConversationId) return;
        if (conversationId && msgConversationId !== conversationId) return;

        if (message?.category === "MESSAGE_RECALL") {
          const recalledId = parseRecallMessageId(message);
          if (recalledId) {
            db.markMessageWithdrawn(recalledId);
            onRecall?.(recalledId);
          }
          acknowledge(message);
          return;
        }

        const content = decodeMessageContent(message);
        db.addMessage({
          messageId: message.message_id,
          conversationId: msgConversationId,
          userId: message.user_id ?? "",
          category: message.category ?? "",
          content,
          createdAt: message.created_at ?? new Date().toISOString(),
          direction: "incoming",
          status: "received",
        });

        onMessage?.({
          messageId: message.message_id,
          conversationId: msgConversationId,
          userId: message.user_id ?? "",
          category: message.category ?? "",
          content,
          createdAt: message.created_at ?? new Date().toISOString(),
          direction: "incoming",
          status: "received",
        });

        acknowledge(message);
      },
    });
  };

  const stopStream = () => client.blaze.stopLoop();

  return {
    sendText,
    createGroupConversation,
    listLocalConversations,
    listLocalMessages,
    listRecentMessages,
    getSetting,
    setSetting,
    getBackgroundBlazeEnabled,
    setBackgroundBlazeEnabled,
    sendConversationText,
    withdrawMessage,
    startStream,
    startConversationStream,
    stopStream,
  };
};
