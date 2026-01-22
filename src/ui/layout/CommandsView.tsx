import React from "react";
import { Box, Text } from "ink";
import { THEME } from "../theme.js";

export const CommandsView: React.FC = () => (
  <Box flexDirection="column" paddingX={1} paddingY={1}>
    <Box marginBottom={1}>
      <Text bold color={THEME.primary}>
        COMMANDS
      </Text>
    </Box>
    <Box flexDirection="column">
      <Box>
        <Text color={THEME.secondary}>/</Text>
        <Text color={THEME.muted}> Open commands</Text>
      </Box>
      <Box>
        <Text color={THEME.secondary}>Ctrl+P</Text>
        <Text color={THEME.muted}> Toggle commands</Text>
      </Box>
      <Box>
        <Text color={THEME.secondary}>Up/Down</Text>
        <Text color={THEME.muted}> Navigate</Text>
      </Box>
      <Box>
        <Text color={THEME.secondary}>Enter</Text>
        <Text color={THEME.muted}> Select/Submit</Text>
      </Box>
      <Box>
        <Text color={THEME.secondary}>Esc</Text>
        <Text color={THEME.muted}> Back/Cancel</Text>
      </Box>
      <Box>
        <Text color={THEME.secondary}>Q</Text>
        <Text color={THEME.muted}> Quit</Text>
      </Box>
    </Box>
  </Box>
);
