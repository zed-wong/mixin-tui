import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { THEME } from "../theme.js";

const stringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(error);
  }
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return stringify(value);
};

const formatObject = (data: Record<string, unknown>) =>
  Object.entries(data).map(([key, value]) => `${key}: ${formatValue(value)}`);

const formatArray = (data: unknown[]) => {
  if (data.length === 0) return ["(empty)"];
  if (typeof data[0] === "object" && data[0] !== null) {
    return data.map((item) => {
      const row = item as Record<string, unknown>;
      const label = row.symbol || row.name || row.asset_id || row.snapshot_id;
      const amount = row.balance || row.amount || row.price_usd;
      const detail = row.created_at || row.asset_id || row.user_id;
      const parts = [label, amount, detail].filter((value) => value).join("  ");
      return parts.length > 0 ? parts : stringify(row);
    });
  }
  return data.map((item) => formatValue(item));
};

type FormattedViewProps = {
  title: string;
  data: unknown;
  inputEnabled?: boolean;
  maxItems?: number;
};

export const FormattedView: React.FC<FormattedViewProps> = ({
  title,
  data,
  inputEnabled = false,
  maxItems = 20,
}) => {
  const [offset, setOffset] = useState(0);

  const lines = React.useMemo(() => {
    return Array.isArray(data)
      ? formatArray(data)
      : data && typeof data === "object"
        ? formatObject(data as Record<string, unknown>)
        : [formatValue(data)];
  }, [data]);

  useEffect(() => {
    setOffset(0);
  }, [data]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.upArrow) {
      setOffset((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setOffset((prev) => Math.min(Math.max(0, lines.length - maxItems), prev + 1));
    }
    if (key.pageUp) {
      setOffset((prev) => Math.max(0, prev - maxItems));
    }
    if (key.pageDown) {
      setOffset((prev) => Math.min(Math.max(0, lines.length - maxItems), prev + maxItems));
    }
  });

  const visibleLines = lines.slice(offset, offset + maxItems);
  const progress = Math.min(100, Math.round(((offset + visibleLines.length) / lines.length) * 100));
  const hasMorePages = lines.length > maxItems;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        marginBottom={1}
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text bold color={THEME.primaryLight}>
          {title.toUpperCase()}
        </Text>
        {hasMorePages && (
          <Text color={THEME.muted}>
            {offset + 1}-{Math.min(offset + maxItems, lines.length)} of {lines.length} ({progress}%)
          </Text>
        )}
      </Box>

      <Box
        borderStyle="single"
        borderColor={THEME.border}
        paddingX={1}
        paddingY={1}
        flexDirection="column"
      >
        {visibleLines.length === 0 ? (
          <Box justifyContent="center" paddingY={2}>
            <Text color={THEME.mutedDim}>No data available</Text>
          </Box>
        ) : (
          visibleLines.map((line, index) => (
            <Box key={`${offset + index}-${line.slice(0, 20)}`} marginBottom={0}>
              <Text color={THEME.textDim}>{line}</Text>
            </Box>
          ))
        )}
      </Box>

      {/* Scroll indicator */}
      {hasMorePages && (
        <Box marginTop={1} justifyContent="center">
          <Text color={THEME.mutedDim}>
            {offset === 0 ? "▼" : offset + maxItems >= lines.length ? "▲" : "▲ ▼"}
            <Text color={THEME.mutedDim}> Scroll with arrow keys </Text>
            {offset === 0 ? "▼" : offset + maxItems >= lines.length ? "▲" : "▲ ▼"}
          </Text>
        </Box>
      )}
    </Box>
  );
};
