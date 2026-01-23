import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { THEME } from "../theme.js";

export type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  type?: "text" | "password" | "textarea";
};

type FormViewProps = {
  title: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  helpText?: string;
  inputEnabled?: boolean;
  setCommandHints?: (hints: string) => void;
};

const renderFieldValue = (field: FormField, value: string) => {
  if (!value) return null;

  if (field.type === "password") {
    return "*".repeat(Math.min(value.length, 20));
  }

  const collapsed = value.replace(/\s+/g, " ");

  if (field.type === "textarea" || collapsed.length > 50) {
    const preview = collapsed.length > 45
      ? `${collapsed.slice(0, 20)}...${collapsed.slice(-20)}`
      : collapsed;
    return (
      <Text>
        {preview} <Text color={THEME.mutedDim}>({value.length} chars)</Text>
      </Text>
    );
  }

  return collapsed;
};

export const FormView: React.FC<FormViewProps> = ({
  title,
  fields,
  onSubmit,
  onCancel,
  helpText,
  inputEnabled = true,
  setCommandHints,
}) => {
  const initialValues = useMemo(
    () =>
      fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = field.initialValue ?? "";
        return acc;
      }, {}),
    [fields]
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setValues(initialValues);
    setActiveIndex(0);
  }, [initialValues]);

  useEffect(() => {
    if (setCommandHints) {
      setCommandHints(helpText || "ENTER = NEXT/SUBMIT, ESC = EXIT");
    }
  }, [setCommandHints, helpText]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setActiveIndex((index) => Math.min(fields.length - 1, index + 1));
      return;
    }

    if (key.return) {
      if (activeIndex < fields.length - 1) {
        setActiveIndex((index) => Math.min(fields.length - 1, index + 1));
      } else {
        onSubmit(values);
      }
      return;
    }

    const currentKey = fields[activeIndex]?.key;
    if (!currentKey) {
      return;
    }

    if (key.backspace || key.delete) {
      setValues((prev) => ({
        ...prev,
        [currentKey]: prev[currentKey].slice(0, -1),
      }));
      return;
    }

    if (!key.ctrl && !key.meta && input.length > 0) {
      setValues((prev) => ({
        ...prev,
        [currentKey]: prev[currentKey] + input,
      }));
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
          {title.toUpperCase()}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={THEME.border}
        paddingX={2}
        paddingY={1}
      >
        {fields.map((field, index) => {
          const isActive = index === activeIndex;
          return (
            <Box
              key={field.key}
              flexDirection="row"
              marginBottom={index < fields.length - 1 ? 1 : 0}
              alignItems="center"
            >
              <Box width={22}>
                <Text
                  color={isActive ? THEME.secondaryLight : THEME.mutedDim}
                  bold={isActive}
                >
                  {isActive ? "▸" : " "}
                  {field.label}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={THEME.mutedDim}>│ </Text>
                <Text
                  color={isActive ? THEME.text : THEME.textDim}
                  backgroundColor={isActive ? THEME.highlight : undefined}
                  bold={isActive}
                >
                  {values[field.key]?.length
                    ? renderFieldValue(field, values[field.key])
                    : isActive
                      ? ""
                      : field.placeholder || "..."}
                </Text>
                {isActive && <Text color={THEME.secondaryLight}>_</Text>}
              </Box>
            </Box>
          );
        })}
      </Box>

      {helpText && (
        <Box marginTop={1} justifyContent="center">
          <Text color={THEME.mutedDim} dimColor>
            {helpText}
          </Text>
        </Box>
      )}
    </Box>
  );
};
