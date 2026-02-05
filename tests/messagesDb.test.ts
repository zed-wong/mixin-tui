import { afterEach, describe, expect, test } from "bun:test";
import { createMessagesDb } from "../src/storage/messagesDb.js";

describe("messages db", () => {
  let db: ReturnType<typeof createMessagesDb> | null = null;

  afterEach(() => {
    db?.close();
    db = null;
  });

  test("stores and lists conversations", () => {
    db = createMessagesDb({ path: ":memory:" });

    db.upsertConversation({
      conversationId: "conv-1",
      name: "Team Chat",
      category: "GROUP",
      participants: ["user-a", "user-b"],
      createdAt: "2024-01-01T00:00:00Z",
    });

    const conversations = db.listConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.conversationId).toBe("conv-1");
    expect(conversations[0]?.participants).toEqual(["user-a", "user-b"]);
  });

  test("stores messages and sorts by created_at", () => {
    db = createMessagesDb({ path: ":memory:" });

    db.upsertConversation({
      conversationId: "conv-2",
      name: "Team Chat",
      category: "GROUP",
      participants: ["user-a", "user-b"],
      createdAt: "2024-01-01T00:00:00Z",
    });

    db.addMessage({
      messageId: "msg-2",
      conversationId: "conv-2",
      userId: "user-b",
      category: "PLAIN_TEXT",
      content: "Later",
      createdAt: "2024-01-01T10:00:00Z",
      direction: "incoming",
      status: "received",
    });
    db.addMessage({
      messageId: "msg-1",
      conversationId: "conv-2",
      userId: "user-a",
      category: "PLAIN_TEXT",
      content: "Earlier",
      createdAt: "2024-01-01T09:00:00Z",
      direction: "incoming",
      status: "received",
    });

    const messages = db.listMessages("conv-2");
    expect(messages.map((msg) => msg.messageId)).toEqual(["msg-1", "msg-2"]);
  });

  test("marks message as withdrawn", () => {
    db = createMessagesDb({ path: ":memory:" });

    db.upsertConversation({
      conversationId: "conv-3",
      name: "Team Chat",
      category: "GROUP",
      participants: ["user-a", "user-b"],
      createdAt: "2024-01-01T00:00:00Z",
    });

    db.addMessage({
      messageId: "msg-3",
      conversationId: "conv-3",
      userId: "user-a",
      category: "PLAIN_TEXT",
      content: "Hello",
      createdAt: "2024-01-01T11:00:00Z",
      direction: "outgoing",
      status: "sent",
    });

    db.markMessageWithdrawn("msg-3");

    const messages = db.listMessages("conv-3");
    expect(messages[0]?.status).toBe("withdrawn");
  });

  test("fetches conversation by id", () => {
    db = createMessagesDb({ path: ":memory:" });

    db.upsertConversation({
      conversationId: "conv-4",
      name: "Invited Group",
      category: "GROUP",
      participants: ["user-a"],
      createdAt: "2024-01-01T00:00:00Z",
    });

    const conversation = db.getConversation("conv-4");
    expect(conversation?.name).toBe("Invited Group");
  });

  test("lists recent messages across conversations", () => {
    db = createMessagesDb({ path: ":memory:" });

    db.upsertConversation({
      conversationId: "conv-a",
      name: "A",
      category: "GROUP",
      participants: ["user-a"],
      createdAt: "2024-01-01T00:00:00Z",
    });
    db.upsertConversation({
      conversationId: "conv-b",
      name: "B",
      category: "GROUP",
      participants: ["user-b"],
      createdAt: "2024-01-01T00:00:00Z",
    });

    db.addMessage({
      messageId: "msg-1",
      conversationId: "conv-a",
      userId: "user-a",
      category: "PLAIN_TEXT",
      content: "First",
      createdAt: "2024-01-01T01:00:00Z",
      direction: "incoming",
      status: "received",
    });
    db.addMessage({
      messageId: "msg-2",
      conversationId: "conv-b",
      userId: "user-b",
      category: "PLAIN_TEXT",
      content: "Second",
      createdAt: "2024-01-01T02:00:00Z",
      direction: "incoming",
      status: "received",
    });

    const recent = db.listRecentMessages(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.messageId).toBe("msg-2");
  });

  test("stores and retrieves settings", () => {
    db = createMessagesDb({ path: ":memory:" });

    expect(db.getSetting("backgroundBlazeEnabled")).toBe(null);

    db.setSetting("backgroundBlazeEnabled", "false");
    expect(db.getSetting("backgroundBlazeEnabled")).toBe("false");
  });
});
