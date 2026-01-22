import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { FormView } from "../components/FormView.js";
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

  const appendMessage = useCallback((nextMessage: StreamMessage) => {
    setMessages((prev) => {
      const next = [...prev, nextMessage].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return next.slice(-50);
    });
  }, []);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Connecting to message stream...");

    setMessages([]);
    setSelectedIndex(null);

    services.messages.startStream({
      onMessage: (message: any) => {
        let content = "";
        if (message.category === "PLAIN_TEXT") {
          if (typeof message.data === "string") {
            content = message.data;
          } else if (message.data instanceof Uint8Array) {
            content = Buffer.from(message.data).toString();
          } else if (
            Array.isArray(message.data) &&
            message.data.every((value: unknown) => typeof value === "number")
          ) {
            content = Buffer.from(message.data).toString();
          } else if (
            message.data &&
            typeof message.data === "object" &&
            "type" in message.data &&
            (message.data as { type?: string }).type === "Buffer" &&
            "data" in message.data &&
            Array.isArray((message.data as { data?: unknown }).data)
          ) {
            content = Buffer.from((message.data as { data: number[] }).data).toString();
          } else {
            content = JSON.stringify(message.data);
          }
        } else if (message.category === "SYSTEM_ACCOUNT_SNAPSHOT") {
          const data = message.data;
          const amount = data.amount || "?";
          const symbol = data.asset?.symbol || "Asset";
          content = `Transfer: ${amount} ${symbol}`;
        } else {
          content = `[${message.category}]`;
        }

        const newMsg: StreamMessage = {
          id: message.message_id,
          userId: message.user_id,
          category: message.category,
          content: content,
          createdAt: message.created_at,
        };

        appendMessage(newMsg);

        const userId = message.user_id?.trim();
        if (userId && !fetchedUsers.current.has(userId)) {
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
        }
      },
    });
    setStatus("idle", "Ready");
    return () => {
      services.messages.stopStream();
      setStatus("idle", "Ready");
    };
  }, [services, setStatus, appendMessage]);

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
      ? `ENTER/R = REPLY TO ${selectedSender}, ESC = EXIT`
      : "UP/DOWN = SELECT, ESC = EXIT";
    setCommandHints(hint.toUpperCase());
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
