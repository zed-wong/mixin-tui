import React from "react";
import { Box, Text } from "ink";
import { THEME } from "../theme.js";

type CommandCategory = {
  title: string;
  color: string;
  commands: Array<{ key: string; description: string }>;
};

const CATEGORIES: CommandCategory[] = [
  {
    title: "GLOBAL",
    color: THEME.primaryLight,
    commands: [
      { key: "/ or Ctrl+P", description: "Show/hide this help" },
      { key: "Q", description: "Quit app (from home)" },
      { key: "Ctrl+C", description: "Force exit" },
    ],
  },
  {
    title: "NAVIGATION",
    color: THEME.infoLight,
    commands: [
      { key: "Up/Down Arrows", description: "Move through menu items" },
      { key: "Enter", description: "Select item / Submit form" },
      { key: "Esc", description: "Go back / Cancel" },
    ],
  },
  {
    title: "WALLET",
    color: THEME.successLight,
    commands: [
      { key: "Home → Wallet", description: "Access wallet menu" },
      { key: "Balances", description: "View all asset balances" },
      { key: "Snapshots", description: "View transaction history" },
      { key: "Transfer", description: "Send tokens to user" },
      { key: "Refund", description: "Refund pending transfer" },
    ],
  },
  {
    title: "NETWORK",
    color: THEME.secondaryLight,
    commands: [
      { key: "Home → Network", description: "Access network menu" },
      { key: "Top Assets", description: "View trending assets" },
      { key: "Search", description: "Search assets by symbol" },
      { key: "Fetch Asset", description: "Get asset details by ID" },
      { key: "Safe Assets", description: "View safe/multisig assets" },
    ],
  },
  {
    title: "USER & MESSAGES",
    color: THEME.purple,
    commands: [
      { key: "Home → User", description: "Access user menu" },
      { key: "My Profile", description: "View your profile info" },
      { key: "Fetch User", description: "Get user by ID/Mixin ID" },
      { key: "Home → Messages", description: "Access messages menu" },
      { key: "Send Text", description: "Send message to user" },
      { key: "Stream", description: "Real-time message stream" },
    ],
  },
  {
    title: "OTHER",
    color: THEME.muted,
    commands: [
      { key: "Auth Token", description: "Generate OAuth token" },
      { key: "Manage Bots", description: "Switch/Add bot configs" },
    ],
  },
];

const CommandRow: React.FC<{
  keyText: string;
  description: string;
  keyColor: string;
}> = ({ keyText, description, keyColor }) => (
  <Box>
    <Box width={18}>
      <Text color={keyColor} bold>
        {keyText}
      </Text>
    </Box>
    <Text color={THEME.textDim}>{description}</Text>
  </Box>
);

export const CommandsView: React.FC = () => (
  <Box flexDirection="column" paddingX={1} paddingY={1}>
    <Box marginBottom={1}>
      <Text bold color={THEME.primaryLight}>
        ════════════════════════════════════════
      </Text>
    </Box>
    <Box marginBottom={1}>
      <Text bold color={THEME.primaryLight}>
        KEYBOARD SHORTCUTS & NAVIGATION
      </Text>
    </Box>
    <Box marginBottom={1}>
      <Text color={THEME.mutedDim}>
        Press Enter, Esc, or Q to close this help
      </Text>
    </Box>

    {CATEGORIES.map((category, idx) => (
      <Box key={idx} flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color={category.color}>
            ── {category.title}
          </Text>
        </Box>
        {category.commands.map((cmd, cmdIdx) => (
          <CommandRow
            key={cmdIdx}
            keyText={cmd.key}
            description={cmd.description}
            keyColor={category.color}
          />
        ))}
      </Box>
    ))}

    <Box marginTop={1}>
      <Text color={THEME.mutedDim}>
        💡 Tip: Use Manage Bots to quickly switch between accounts
      </Text>
    </Box>
  </Box>
);
