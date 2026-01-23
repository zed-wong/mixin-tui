import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { FormattedView } from "../components/JsonView.js";
import { THEME } from "../theme.js";

export const ResultScreen: React.FC<{
  title: string;
  data: unknown;
  onBack: () => void;
  onCopy?: () => void;
  inputEnabled: boolean;
  maxItems?: number;
  summaryLines?: string[];
  onRefund?: () => void;
  setCommandHints: (hints: string) => void;
}> = ({
  title,
  data,
  onBack,
  onCopy,
  inputEnabled,
  maxItems,
  summaryLines,
  onRefund,
  setCommandHints,
}) => {
  useEffect(() => {
    const hints = [
      "ESC/ENTER -> Exit",
      onCopy ? "C -> Copy" : null,
      onRefund ? "R -> Refund" : null,
    ]
      .filter(Boolean)
      .join(", ");
    setCommandHints(hints);
  }, [onCopy, onRefund, setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape || key.return || key.backspace) {
      onBack();
      return;
    }
    if (onCopy && (input === "c" || input === "C")) {
      onCopy();
    }
    if (onRefund && (input === "r" || input === "R")) {
      onRefund();
    }
  });

  return (
    <Box flexDirection="column">
      {summaryLines && summaryLines.length > 0 ? (
        <Box
          flexDirection="column"
          paddingX={1}
          marginBottom={1}
          borderStyle="single"
          borderColor={THEME.border}
          padding={1}
        >
          {summaryLines.map((line) => (
            <Text key={line} color={THEME.text}>
              {line}
            </Text>
          ))}
        </Box>
      ) : null}
      <FormattedView
        title={title}
        data={data}
        inputEnabled={inputEnabled}
        maxItems={maxItems}
      />
    </Box>
  );
};
