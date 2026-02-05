import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type ConversationRecord = {
  conversationId: string;
  name: string;
  category: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  messageId: string;
  conversationId: string;
  userId: string;
  category: string;
  content: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
  status: "received" | "sent" | "withdrawn";
};

export type CreateConversationInput = {
  conversationId: string;
  name: string;
  category: string;
  participants: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateMessageInput = {
  messageId: string;
  conversationId: string;
  userId: string;
  category: string;
  content: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
  status: "received" | "sent" | "withdrawn";
};

const DEFAULT_DB_PATH = path.join(os.homedir(), ".mixin-tui", "messages.sqlite");

const ensureDbDir = (dbPath: string) => {
  const dir = path.dirname(dbPath);
  mkdirSync(dir, { recursive: true });
};

const parseParticipants = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
};

export const createMessagesDb = (options?: { path?: string }) => {
  const dbPath = options?.path ?? DEFAULT_DB_PATH;
  if (dbPath !== ":memory:") {
    ensureDbDir(dbPath);
  }

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      conversation_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      participants TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS messages_by_conversation
      ON messages(conversation_id, created_at);
  `);

  const upsertConversation = (input: CreateConversationInput) => {
    const createdAt = input.createdAt ?? new Date().toISOString();
    const updatedAt = input.updatedAt ?? createdAt;
    db.prepare(
      `INSERT INTO conversations (
        conversation_id,
        name,
        category,
        participants,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(conversation_id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        participants = excluded.participants,
        updated_at = excluded.updated_at`
    ).run(
      input.conversationId,
      input.name,
      input.category,
      JSON.stringify(input.participants),
      createdAt,
      updatedAt
    );
  };

  const listConversations = (): ConversationRecord[] => {
    const rows = db
      .prepare(
        `SELECT conversation_id, name, category, participants, created_at, updated_at
         FROM conversations
         ORDER BY updated_at DESC`
      )
      .all() as Array<{
      conversation_id: string;
      name: string;
      category: string;
      participants: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      conversationId: row.conversation_id,
      name: row.name,
      category: row.category,
      participants: parseParticipants(row.participants),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  };

  const getConversation = (conversationId: string): ConversationRecord | null => {
    const row = db
      .prepare(
        `SELECT conversation_id, name, category, participants, created_at, updated_at
         FROM conversations
         WHERE conversation_id = ?`
      )
      .get(conversationId) as
      | {
          conversation_id: string;
          name: string;
          category: string;
          participants: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) return null;
    return {
      conversationId: row.conversation_id,
      name: row.name,
      category: row.category,
      participants: parseParticipants(row.participants),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const addMessage = (input: CreateMessageInput) => {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO messages (
        message_id,
        conversation_id,
        user_id,
        category,
        content,
        created_at,
        direction,
        status,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO UPDATE SET
        content = excluded.content,
        status = excluded.status,
        updated_at = excluded.updated_at`
    ).run(
      input.messageId,
      input.conversationId,
      input.userId,
      input.category,
      input.content,
      input.createdAt,
      input.direction,
      input.status,
      updatedAt
    );

    db.prepare(
      `UPDATE conversations
       SET updated_at = ?
       WHERE conversation_id = ?`
    ).run(input.createdAt, input.conversationId);
  };

  const listMessages = (conversationId: string): MessageRecord[] => {
    const rows = db
      .prepare(
        `SELECT message_id, conversation_id, user_id, category, content, created_at, direction, status
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`
      )
      .all(conversationId) as Array<{
      message_id: string;
      conversation_id: string;
      user_id: string;
      category: string;
      content: string;
      created_at: string;
      direction: "incoming" | "outgoing";
      status: "received" | "sent" | "withdrawn";
    }>;

    return rows.map((row) => ({
      messageId: row.message_id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      category: row.category,
      content: row.content,
      createdAt: row.created_at,
      direction: row.direction,
      status: row.status,
    }));
  };

  const listRecentMessages = (limit = 50): MessageRecord[] => {
    const max = Math.max(1, Math.min(limit, 200));
    const rows = db
      .prepare(
        `SELECT message_id, conversation_id, user_id, category, content, created_at, direction, status
         FROM messages
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(max) as Array<{
      message_id: string;
      conversation_id: string;
      user_id: string;
      category: string;
      content: string;
      created_at: string;
      direction: "incoming" | "outgoing";
      status: "received" | "sent" | "withdrawn";
    }>;

    return rows.map((row) => ({
      messageId: row.message_id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      category: row.category,
      content: row.content,
      createdAt: row.created_at,
      direction: row.direction,
      status: row.status,
    }));
  };

  const getSetting = (key: string): string | null => {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  };

  const setSetting = (key: string, value: string) => {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    ).run(key, value, updatedAt);
  };

  const markMessageWithdrawn = (messageId: string) => {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `UPDATE messages
       SET status = 'withdrawn', updated_at = ?
       WHERE message_id = ?`
    ).run(updatedAt, messageId);
  };

  const close = () => db.close();

  return {
    upsertConversation,
    listConversations,
    getConversation,
    addMessage,
    listMessages,
    listRecentMessages,
    getSetting,
    setSetting,
    markMessageWithdrawn,
    close,
  };
};
