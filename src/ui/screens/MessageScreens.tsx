import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { FormView } from "../components/FormView.js";
import { MenuList } from "../components/MenuList.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, StatusState } from "../types.js";

type StreamMessage = {
  id: string;
  userId: string;
  category: string;
  content: string;
  createdAt: string;
  senderName?: string;
};

type LocalMessage = {
  messageId: string;
  userId: string;
  category: string;
  content: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
  status: "received" | "sent" | "withdrawn";
};

export const MessagesSendTextScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  initialUserId?: string;
  returnToStream?: boolean;
  setCommandHints: (hints: string) => void;
}> = ({
  services,
  nav,
  setStatus,
  inputEnabled,
  initialUserId,
  returnToStream,
  setCommandHints,
}) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to send messages.</Text>;
  }

  return (
    <FormView
      title="Send Text Message"
      fields={[
        {
          key: "userId",
          label: "User ID",
          placeholder: "UUID",
          initialValue: initialUserId,
        },
        { key: "text", label: "Message", placeholder: "Text" },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Sending message...");
        const userId = values.userId?.trim() ?? "";
        const text = values.text ?? "";
        services.messages
          .sendText(userId, text)
          .then((result) => {
            if (returnToStream) {
              setStatus("success", "Message sent");
              nav.pop();
            } else {
              nav.push({ id: "result", title: "Message Result", data: result });
              setStatus("idle", "Ready");
            }
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const MessagesStreamScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const fetchedUsers = useRef<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const refreshMessages = useCallback(() => {
    if (!services) return;
    const recent = services.messages.listRecentMessages(50);
    setMessages(
      recent
        .map((msg) => ({
          id: msg.messageId,
          userId: msg.userId,
          category: msg.category,
          content: msg.status === "withdrawn" ? "[withdrawn]" : msg.content,
          createdAt: msg.createdAt,
          senderName: msg.direction === "outgoing" ? "You" : undefined,
        }))
        .reverse()
    );
  }, [services]);

  useEffect(() => {
    if (!services) return;
    setStatus("idle", "Ready");
    refreshMessages();
    const timer = setInterval(refreshMessages, 1000);
    return () => clearInterval(timer);
  }, [services, setStatus, refreshMessages]);

  useEffect(() => {
    if (!services) return;
    messages.forEach((message) => {
      if (message.senderName === "You") return;
      const userId = message.userId?.trim();
      if (!userId || fetchedUsers.current.has(userId)) return;
      fetchedUsers.current.add(userId);

      services.user
        .fetch(userId)
        .then((user) => {
          setUserMap((prev) => ({
            ...prev,
            [user.user_id]: user.full_name,
          }));
        })
        .catch(() => {
          fetchedUsers.current.delete(userId);
        });
    });
  }, [messages, services]);

  if (!services) {
    return <Text color={THEME.muted}>Load a config to stream messages.</Text>;
  }

  const displayMessages = messages.slice(-15);
  const selectedMessage =
    selectedIndex !== null ? displayMessages[selectedIndex] : null;
  const selectedSender = selectedMessage
    ? selectedMessage.senderName || userMap[selectedMessage.userId] || "User"
    : null;

  useEffect(() => {
    const hint = selectedSender
      ? `ENTER/R -> Reply to ${selectedSender}, ESC -> Exit`
      : "▲ / ▼ -> Select, ESC -> Exit";
    setCommandHints(hint);
  }, [selectedSender, setCommandHints]);

  useEffect(() => {
    if (selectedIndex === null) return;
    if (displayMessages.length === 0) {
      setSelectedIndex(null);
      return;
    }
    if (selectedIndex >= displayMessages.length) {
      setSelectedIndex(displayMessages.length - 1);
    }
  }, [displayMessages.length, selectedIndex]);

  useInput((input, key) => {
    if (!inputEnabled) return;

    if (key.escape) {
      if (selectedIndex !== null) {
        setSelectedIndex(null);
        return;
      }
      nav.pop();
      return;
    }

    if (key.upArrow) {
      if (displayMessages.length === 0) return;
      setSelectedIndex((prev) => {
        if (prev === null) return displayMessages.length - 1;
        return Math.max(0, prev - 1);
      });
      return;
    }

    if (key.downArrow) {
      if (displayMessages.length === 0) return;
      setSelectedIndex((prev) => {
        if (prev === null) return 0;
        return Math.min(displayMessages.length - 1, prev + 1);
      });
      return;
    }

    if ((input === "r" || key.return) && selectedIndex !== null) {
      const msg = displayMessages[selectedIndex];
      if (msg) {
        nav.push({
          id: "messages-send-text",
          userId: msg.userId,
          returnToStream: true,
        });
      }
      return;
    }

    if (key.return) {
      nav.pop();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        marginBottom={1}
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text bold color={THEME.primary}>
          MESSAGE STREAM
        </Text>
        <Text color={THEME.success}>Listening for messages</Text>
      </Box>
      {messages.length === 0 ? (
        <Text color={THEME.muted}>Waiting for messages...</Text>
      ) : (
        <Box flexDirection="column">
          {displayMessages.map((msg) => {
            const senderName = msg.senderName || userMap[msg.userId] || "User";
            const isSelected = selectedMessage?.id === msg.id;
            return (
              <Box key={msg.id} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={isSelected ? THEME.secondary : THEME.muted}>
                    {isSelected ? "> " : "  "}
                  </Text>
                  <Text
                    color={THEME.muted}
                    backgroundColor={isSelected ? THEME.highlight : undefined}
                  >
                    [{formatTime(msg.createdAt)}] 
                  </Text>
                  <Text
                    color={THEME.primary}
                    bold
                    backgroundColor={isSelected ? THEME.highlight : undefined}
                  >
                    {senderName}
                  </Text>
                </Box>
                <Box
                  paddingLeft={1}
                  borderStyle="single"
                  borderTop={false}
                  borderRight={false}
                  borderBottom={false}
                  borderColor={isSelected ? THEME.secondary : THEME.border}
                >
                  <Text color={THEME.text}>{msg.content}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export const MessagesGroupCreateScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to create groups.</Text>;
  }

  return (
    <FormView
      title="Create Group"
      fields={[
        { key: "name", label: "Group Name", placeholder: "Team Chat" },
        {
          key: "participants",
          label: "Participants",
          placeholder: "UUIDs separated by comma/newline",
          type: "textarea",
        },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      helpText="ENTER = NEXT/SUBMIT, ESC = EXIT"
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Creating group...");
        const name = values.name ?? "";
        const participants = (values.participants ?? "")
          .split(/[,\n\r\s]+/)
          .map((id) => id.trim())
          .filter(Boolean);
        services.messages
          .createGroupConversation({ name, participantIds: participants })
          .then((conversation) => {
            setStatus("success", "Group created");
            nav.push({
              id: "messages-group-chat",
              conversationId: conversation.conversation_id,
              name: conversation.name,
            });
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const MessagesGroupListScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, inputEnabled, setCommandHints }) => {
  const [conversations, setConversations] = useState(
    [] as Array<{
      conversationId: string;
      name: string;
      participants: string[];
    }>
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setCommandHints("ENTER -> Open, ESC -> Back");
  }, [setCommandHints]);

  const refreshList = useCallback(() => {
    if (!services) return;
    const list = services.messages.listLocalConversations();
    setConversations(
      list.map((entry) => ({
        conversationId: entry.conversationId,
        name: entry.name,
        participants: entry.participants,
      }))
    );
    setSelectedIndex(0);
  }, [services]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!services) return;
    const timer = setInterval(refreshList, 1000);
    return () => clearInterval(timer);
  }, [services, refreshList]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      nav.pop();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(conversations.length - 1, index + 1));
      return;
    }
    if (key.return) {
      const selected = conversations[selectedIndex];
      if (!selected) return;
      nav.push({
        id: "messages-group-chat",
        conversationId: selected.conversationId,
        name: selected.name,
      });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to view groups.</Text>;
  }

  const items = useMemo(
    () =>
      conversations.map((conversation) => ({
        label: conversation.name || conversation.conversationId,
        value: conversation.conversationId,
        description: `${conversation.participants.length} members`,
      })),
    [conversations]
  );

  return (
    <MenuList
      title="Group Conversations"
      items={items}
      selectedIndex={Math.max(0, Math.min(selectedIndex, items.length - 1))}
      emptyMessage="No groups yet"
      maxItems={Math.max(3, 16)}
    />
  );
};

export const MessagesGroupChatScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  conversationId: string;
  name?: string;
  setCommandHints: (hints: string) => void;
}> = ({
  services,
  nav,
  setStatus,
  inputEnabled,
  conversationId,
  name,
  setCommandHints,
}) => {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const refreshMessages = useCallback(() => {
    if (!services) return;
    setMessages(services.messages.listLocalMessages(conversationId));
  }, [services, conversationId]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!services) return;
    const timer = setInterval(refreshMessages, 1000);
    return () => clearInterval(timer);
  }, [services, refreshMessages]);

  useEffect(() => {
    const hint = selectedIndex !== null
      ? "ENTER/S -> Send, W -> Withdraw, ESC -> Back"
      : "▲ / ▼ -> Select, ENTER -> Send, ESC -> Back";
    setCommandHints(hint);
  }, [selectedIndex, setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      if (selectedIndex !== null) {
        setSelectedIndex(null);
        return;
      }
      nav.pop();
      return;
    }
    if (key.upArrow) {
      if (messages.length === 0) return;
      setSelectedIndex((prev) => {
        if (prev === null) return messages.length - 1;
        return Math.max(0, prev - 1);
      });
      return;
    }
    if (key.downArrow) {
      if (messages.length === 0) return;
      setSelectedIndex((prev) => {
        if (prev === null) return 0;
        return Math.min(messages.length - 1, prev + 1);
      });
      return;
    }
    if (input === "w" && selectedIndex !== null && services) {
      const target = messages[selectedIndex];
      if (!target || target.direction !== "outgoing" || target.status === "withdrawn") {
        return;
      }
      setStatus("loading", "Withdrawing message...");
      services.messages
        .withdrawMessage({
          conversationId,
          messageId: target.messageId,
        })
        .then(() => {
          setStatus("success", "Message withdrawn");
          refreshMessages();
        })
        .catch((error) => {
          setStatus(
            "error",
            error instanceof Error ? error.message : String(error)
          );
        });
      return;
    }
    if (key.return || input === "s") {
      nav.push({ id: "messages-group-send", conversationId });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to view messages.</Text>;
  }

  const displayMessages = messages.slice(-20);
  const selectedMessage =
    selectedIndex !== null ? displayMessages[selectedIndex] : null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        marginBottom={1}
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text bold color={THEME.primary}>
          {name ? name.toUpperCase() : "GROUP CHAT"}
        </Text>
        <Text color={THEME.muted}>{conversationId.slice(0, 8)}...</Text>
      </Box>
      {displayMessages.length === 0 ? (
        <Text color={THEME.muted}>No local messages yet.</Text>
      ) : (
        <Box flexDirection="column">
          {displayMessages.map((msg) => {
            const isSelected = selectedMessage?.messageId === msg.messageId;
            const sender = msg.direction === "outgoing" ? "You" : "Member";
            const content = msg.status === "withdrawn" ? "[withdrawn]" : msg.content;
            return (
              <Box key={msg.messageId} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={isSelected ? THEME.secondary : THEME.muted}>
                    {isSelected ? "> " : "  "}
                  </Text>
                  <Text
                    color={THEME.muted}
                    backgroundColor={isSelected ? THEME.highlight : undefined}
                  >
                    [{new Date(msg.createdAt).toLocaleString()}] 
                  </Text>
                  <Text
                    color={THEME.primary}
                    bold
                    backgroundColor={isSelected ? THEME.highlight : undefined}
                  >
                    {sender}
                  </Text>
                </Box>
                <Box
                  paddingLeft={1}
                  borderStyle="single"
                  borderTop={false}
                  borderRight={false}
                  borderBottom={false}
                  borderColor={isSelected ? THEME.secondary : THEME.border}
                >
                  <Text color={THEME.text}>{content}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export const MessagesGroupSendScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  conversationId: string;
  setCommandHints: (hints: string) => void;
}> = ({
  services,
  nav,
  setStatus,
  inputEnabled,
  conversationId,
  setCommandHints,
}) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to send messages.</Text>;
  }

  return (
    <FormView
      title="Send Group Message"
      fields={[{ key: "text", label: "Message", placeholder: "Text" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Sending message...");
        const text = values.text ?? "";
        services.messages
          .sendConversationText(conversationId, text)
          .then(() => {
            setStatus("success", "Message sent");
            nav.pop();
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const MessagesSettingsScreen: React.FC<{
  nav: Nav;
  inputEnabled: boolean;
  backgroundBlazeEnabled: boolean | null;
  onToggleBackgroundBlaze: () => void;
  setCommandHints: (hints: string) => void;
}> = ({
  nav,
  inputEnabled,
  backgroundBlazeEnabled,
  onToggleBackgroundBlaze,
  setCommandHints,
}) => {
  useEffect(() => {
    setCommandHints("ENTER/T -> Toggle, ESC -> Back");
  }, [setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      nav.pop();
      return;
    }
    if (key.return || input === "t") {
      onToggleBackgroundBlaze();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        marginBottom={1}
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={1}
      >
        <Text bold color={THEME.primaryLight}>
          MESSAGE SETTINGS
        </Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor={THEME.border}>
        <Box paddingX={2} paddingY={1}>
          <Text color={THEME.muted}>Background Blaze</Text>
          <Text> </Text>
          {backgroundBlazeEnabled === null ? (
            <Text color={THEME.muted}>Loading...</Text>
          ) : (
            <Text color={backgroundBlazeEnabled ? THEME.success : THEME.warning}>
              {backgroundBlazeEnabled ? "ON" : "OFF"}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
