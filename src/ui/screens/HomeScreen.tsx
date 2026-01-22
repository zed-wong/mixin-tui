import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { type MenuItem } from "../components/MenuList.js";
import { THEME } from "../theme.js";

const HOME_LOGO = [
  "___  ___ _       _          _____  _   _  _____ ",
  "|  \\/  |(_)     (_)        |_   _|| | | ||_   _|",
  "| .  . | _ __  __ _  _ __    | |  | | | |  | |  ",
  "| |\\/| || |\\ \\/ /| || '_ \\   | |  | | | |  | |  ",
  "| |  | || | >  < | || | | |  | |  | |_| | _| |_ ",
  "\\_|  |_/|_|/_/\\_\\|_||_| |_|  \\_/   \\___/  \\___/ ",
];

export const HomeScreen: React.FC<{
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ items, onSelect, inputEnabled, setCommandHints }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setCommandHints("ARROWS = CHOOSE, ENTER = OPEN, Q = QUIT, / = COMMANDS");
  }, [setCommandHints]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useInput((input, key) => {
    if (!inputEnabled || items.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev + 1) % items.length);
      return;
    }
    if (key.return && items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box flexDirection="column" marginBottom={1} alignItems="center">
        {HOME_LOGO.map((line) => (
          <Text key={line} color={THEME.primary} bold>
            {line}
          </Text>
        ))}
        <Box marginTop={1}>
          <Text color={THEME.muted} dimColor>
            The terminal client for Mixin Network
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={3}
        paddingY={1}
        width={46}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Box key={item.value} justifyContent="space-between">
              <Box>
                <Text color={isSelected ? THEME.secondary : THEME.border}>
                  {isSelected ? ">" : " "}
                </Text>
                <Text>  </Text>
                <Text
                  color={isSelected ? THEME.text : THEME.muted}
                  bold={isSelected}
                  backgroundColor={isSelected ? THEME.highlight : undefined}
                >
                  {item.label}
                </Text>
              </Box>
              <Text color={isSelected ? THEME.secondary : THEME.border}>
                {isSelected ? "Enter" : "     "}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
