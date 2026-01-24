import React from "react";
import { Box, Text } from "ink";
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
  data?: unknown;
  lines?: string[];
  totalLines?: number;
  scrollOffset?: number;
  showScrollIndicator?: boolean;
};

export const FormattedView: React.FC<FormattedViewProps> = ({
  title,
  data,
  lines,
  totalLines,
  scrollOffset = 0,
  showScrollIndicator = false,
}) => {
  const displayLines = React.useMemo(() => {
    if (lines) return lines;
    return Array.isArray(data)
      ? formatArray(data)
      : data && typeof data === "object"
        ? formatObject(data as Record<string, unknown>)
        : [formatValue(data)];
  }, [data, lines]);

  const totalCount = totalLines ?? displayLines.length;

  return (
    <Box flexDirection="column" paddingX={1}>
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

      <Box
        borderStyle="single"
        borderColor={THEME.border}
        paddingX={1}
        paddingY={1}
        flexDirection="column"
      >
        {displayLines.length === 0 ? (
          <Box justifyContent="center" paddingY={2}>
            <Text color={THEME.mutedDim}>No data available</Text>
          </Box>
        ) : (
          <>
            {displayLines.map((line, index) => (
              <Box key={`${scrollOffset}-${index}-${line.slice(0, 20)}`}>
                <Text color={THEME.textDim}>{line}</Text>
              </Box>
            ))}
            {showScrollIndicator && totalCount > 0 && (
              <Box marginTop={1} justifyContent="center">
                <Text color={THEME.mutedDim}>
                  ─ {scrollOffset + 1}-{scrollOffset + displayLines.length} of {totalCount} ─
                </Text>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
