import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, Newline } from "ink";
import { THEME } from "../theme.js";

export type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
};

type FormViewProps = {
  title: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  helpText?: string;
  inputEnabled?: boolean;
};

export const FormView: React.FC<FormViewProps> = ({
  title,
  fields,
  onSubmit,
  onCancel,
  helpText,
  inputEnabled = true,
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

    if (!key.ctrl && !key.meta && /^[\x20-\x7E]$/.test(input)) {
      setValues((prev) => ({
        ...prev,
        [currentKey]: prev[currentKey] + input,
      }));
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1} borderStyle="round" borderColor={THEME.border} paddingX={1}>
        <Text bold color={THEME.primary}>
          {title.toUpperCase()}
        </Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor={THEME.border} padding={1}>
        {fields.map((field, index) => (
          <Box key={field.key} flexDirection="row" marginBottom={1}>
            <Box width={20}>
              <Text
                color={index === activeIndex ? THEME.secondary : THEME.muted}
                bold={index === activeIndex}
              >
                {index === activeIndex ? "› " : "  "}
                {field.label}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.muted}>│ </Text>
              <Text
                color={index === activeIndex ? THEME.text : THEME.muted}
                backgroundColor={index === activeIndex ? THEME.highlight : undefined}
              >
                 {values[field.key]?.length
                  ? values[field.key]
                  : index === activeIndex
                    ? ""
                    : field.placeholder || "..."} 
              </Text>
              {index === activeIndex && <Text color={THEME.secondary}>_</Text>}
            </Box>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={THEME.muted} dimColor>
          {helpText || "Enter: Next/Submit • Esc: Cancel"}
        </Text>
      </Box>
    </Box>
  );
};
