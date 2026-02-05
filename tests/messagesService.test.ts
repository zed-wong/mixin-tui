import { describe, expect, test } from "bun:test";
import { createMessagesDb } from "../src/storage/messagesDb.js";
import { createMessagesService } from "../src/mixin/services/messages.js";

const base64RawUrlEncode = (value: string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

describe("messages service", () => {
  test("creates group conversation and stores locally", async () => {
    const db = createMessagesDb({ path: ":memory:" });
    const client = {
      conversation: {
        createGroup: async (_id: string, _name: string, _participants: any[]) => ({
          conversation_id: "conv-123",
          category: "GROUP",
          name: "Team Chat",
          created_at: "2024-01-01T00:00:00Z",
          participant_sessions: [
            { user_id: "user-a", session_id: "", public_key: "" },
            { user_id: "user-b", session_id: "", public_key: "" },
          ],
        }),
      },
      message: {
        sendOne: async (_message: any) => ({}),
      },
      blaze: {
        loop: (_handler: any) => {},
        stopLoop: () => {},
      },
    } as any;

    const service = createMessagesService(client, {
      db,
      appId: "bot-id",
    });

    await service.createGroupConversation({
      name: "Team Chat",
      participantIds: ["user-a", "user-b"],
    });

    const conversations = service.listLocalConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.conversationId).toBe("conv-123");
    expect(conversations[0]?.participants).toEqual(["user-a", "user-b"]);

    db.close();
  });

  test("sends conversation text and stores outgoing message", async () => {
    const db = createMessagesDb({ path: ":memory:" });
    const sent: any[] = [];
    const client = {
      conversation: {
        createGroup: async () => ({}),
      },
      message: {
        sendOne: async (message: any) => {
          sent.push(message);
          return {};
        },
      },
      blaze: {
        loop: (_handler: any) => {},
        stopLoop: () => {},
      },
    } as any;

    const service = createMessagesService(client, {
      db,
      appId: "bot-id",
    });

    await service.sendConversationText("conv-999", "Hello");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.conversation_id).toBe("conv-999");
    expect(sent[0]?.category).toBe("PLAIN_TEXT");
    expect(sent[0]?.data_base64).toBe(base64RawUrlEncode("Hello"));

    const messages = service.listLocalMessages("conv-999");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.direction).toBe("outgoing");
    expect(messages[0]?.status).toBe("sent");

    db.close();
  });

  test("withdraws message and marks it locally", async () => {
    const db = createMessagesDb({ path: ":memory:" });
    const client = {
      conversation: {
        createGroup: async () => ({}),
      },
      message: {
        sendOne: async (_message: any) => ({}),
      },
      blaze: {
        loop: (_handler: any) => {},
        stopLoop: () => {},
      },
    } as any;

    const service = createMessagesService(client, {
      db,
      appId: "bot-id",
    });

    db.upsertConversation({
      conversationId: "conv-1",
      name: "Team Chat",
      category: "GROUP",
      participants: ["bot-id"],
      createdAt: "2024-01-01T00:00:00Z",
    });
    db.addMessage({
      messageId: "msg-123",
      conversationId: "conv-1",
      userId: "bot-id",
      category: "PLAIN_TEXT",
      content: "Hello",
      createdAt: "2024-01-01T01:00:00Z",
      direction: "outgoing",
      status: "sent",
    });

    await service.withdrawMessage({
      conversationId: "conv-1",
      messageId: "msg-123",
    });

    const messages = service.listLocalMessages("conv-1");
    expect(messages[0]?.status).toBe("withdrawn");

    db.close();
  });

  test("stores invited group from SYSTEM_CONVERSATION", async () => {
    const db = createMessagesDb({ path: ":memory:" });
    let handler: any = null;
    const client = {
      conversation: {
        createGroup: async () => ({}),
        fetch: async (_id: string) => ({
          conversation_id: "conv-invite",
          category: "GROUP",
          name: "Invited",
          created_at: "2024-01-02T00:00:00Z",
          participant_sessions: [{ user_id: "user-a", session_id: "", public_key: "" }],
        }),
      },
      message: {
        sendOne: async (_message: any) => ({}),
        sendAcknowledgement: async (_message: any) => ([]),
      },
      blaze: {
        loop: (nextHandler: any) => {
          handler = nextHandler;
        },
        stopLoop: () => {},
      },
    } as any;

    const service = createMessagesService(client, {
      db,
      appId: "bot-id",
    });

    service.startConversationStream({});

    await handler?.onConversation({
      category: "SYSTEM_CONVERSATION",
      message_id: "msg-1",
      conversation_id: "conv-invite",
      data: JSON.stringify({
        conversation_id: "conv-invite",
        category: "GROUP",
        participants: [{ user_id: "user-a" }],
      }),
      created_at: "2024-01-02T00:00:00Z",
    });

    const conversations = service.listLocalConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.conversationId).toBe("conv-invite");
    expect(conversations[0]?.name).toBe("Invited");

    db.close();
  });
});
