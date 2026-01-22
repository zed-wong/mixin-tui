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
  data: unknown;
};

export const FormattedView: React.FC<FormattedViewProps> = ({ title, data }) => {
  const lines = Array.isArray(data)
    ? formatArray(data)
    : data && typeof data === "object"
      ? formatObject(data as Record<string, unknown>)
      : [formatValue(data)];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1} borderStyle="round" borderColor={THEME.border} paddingX={1}>
        <Text bold color={THEME.primary}>
          {title.toUpperCase()}
        </Text>
      </Box>
      <Box borderStyle="single" borderColor={THEME.border} padding={1} flexDirection="column">
        {lines.map((line, index) => (
          <Text key={`${index}-${line}`} color={THEME.text}>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
