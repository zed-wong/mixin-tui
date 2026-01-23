import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { THEME } from "../theme.js";

type ConfirmViewProps = {
  title: string;
  message: string;
  details?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
};

export const ConfirmView: React.FC<ConfirmViewProps> = ({
  title,
  message,
  details,
  onConfirm,
  onCancel,
  inputEnabled,
  setCommandHints,
}) => {
  useEffect(() => {
    setCommandHints("Y -> Confirm, N/ESC -> Cancel");
  }, [setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape || input === "n" || input === "N") {
      onCancel();
      return;
    }
    if (input === "y" || input === "Y") {
      onConfirm();
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
        borderColor={THEME.warning}
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={details?.length ? 1 : 0}>
          <Text color={THEME.warning} bold>
            {message}
          </Text>
        </Box>

        {details && details.length > 0 && (
          <Box flexDirection="column" marginTop={1} marginBottom={1}>
            {details.map((detail, index) => (
              <Box key={index}>
                <Text color={THEME.textDim}>{detail}</Text>
              </Box>
            ))}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color={THEME.mutedDim}>Confirm? [Y/N]</Text>
        </Box>
      </Box>
    </Box>
  );
};
