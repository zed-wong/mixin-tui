import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
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
        onCopy ? "C -> Copy" : null,
        onRefund ? "R -> Refund" : null,
        "ESC/ENTER -> Exit",
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

    // Format the data to display
    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined) return "-";
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    };

    const formatDataLines = (data: unknown): string[] => {
      if (Array.isArray(data)) {
        if (data.length === 0) return ["(empty)"];
        if (typeof data[0] === "object" && data[0] !== null) {
          return data.flatMap((item) => {
            const row = item as Record<string, unknown>;
            return Object.entries(row).map(([key, value]) => `${key}: ${formatValue(value)}`);
          });
        }
        return data.map((item) => formatValue(item));
      }
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>).map(
          ([key, value]) => `${key}: ${formatValue(value)}`
        );
      }
      return [formatValue(data)];
    };

    const resultDataLines = formatDataLines(data);
    const allLines = [...resultDataLines, ...(summaryLines || [])];

    return (
      <Box flexDirection="column" paddingX={1}>
        {/* Title Header */}
        <Box
          marginBottom={1}
          borderStyle="round"
          borderColor={THEME.border}
          paddingX={1}
        >
          <Text bold color={THEME.primaryLight}>
            {title.toUpperCase()}
          </Text>
        </Box>

        {/* Combined Details Box */}
        <Box
          borderStyle="single"
          borderColor={THEME.border}
          paddingX={1}
          paddingY={1}
          flexDirection="column"
        >
          {allLines.length === 0 ? (
            <Box justifyContent="center" paddingY={2}>
              <Text color={THEME.mutedDim}>No data available</Text>
            </Box>
          ) : (
            allLines.map((line, index) => (
              <Box key={`${index}-${line.slice(0, 20)}`} marginBottom={0}>
                <Text color={THEME.textDim}>{line}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    );
  };
