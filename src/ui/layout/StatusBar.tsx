import React, { useEffect, useState } from "react";
import { Box, Spacer, Text } from "ink";
import { THEME } from "../theme.js";
import type { StatusState } from "../types.js";

const Spinner = () => {
  const [frame, setFrame] = useState(0);
  const frames = ["-", "\\", "|", "/"];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text>{frames[frame]}</Text>;
};

export const StatusBar: React.FC<{
  status: StatusState;
  message: string;
  commandHints?: string;
}> = ({ status, message, commandHints }) => {
  const color =
    status === "error"
      ? THEME.error
      : status === "success"
        ? THEME.success
        : status === "loading"
          ? THEME.warning
          : THEME.primary;

  const showMessage =
    message && !(status === "idle" && message.toLowerCase() === "ready");
  const showLabel = status === "loading";

  return (
    <Box paddingX={1} flexDirection="row" height={1} alignItems="center">
      {showLabel && (
        <>
          <Text color={THEME.muted}>{"~ "}</Text>
          <Text color={color} bold>
            {status}
          </Text>
        </>
      )}
      {status === "loading" && (
        <Box marginLeft={1}>
          <Text color={THEME.warning}>
            <Spinner />
          </Text>
        </Box>
      )}
      {showMessage && (
        <>
          {showLabel && <Text color={THEME.muted}> · </Text>}
          <Text color={THEME.text}>{message}</Text>
        </>
      )}
      <Spacer />
      {commandHints && (
        <Text>
          {commandHints.split(",").map((hint, i, arr) => {
            const [key, action] = hint.includes("=")
              ? hint.split("=")
              : [hint, ""];
            return (
              <Text key={i}>
                {action ? (
                  <>
                    <Text color={THEME.text}>{key?.trim()}</Text>
                    <Text color={THEME.muted}> = {action.trim()}</Text>
                  </>
                ) : (
                  <Text color={THEME.muted}>{key?.trim()}</Text>
                )}
                {i < arr.length - 1 && <Text color={THEME.muted}>, </Text>}
              </Text>
            );
          })}
        </Text>
      )}
    </Box>
  );
};
