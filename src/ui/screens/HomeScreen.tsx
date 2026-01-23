import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { type MenuItem } from "../components/MenuList.js";
import { ALL_GRADIENTS, GRADIENTS, THEME } from "../theme.js";

const HOME_LOGO = [
  "███╗   ███╗██╗██╗  ██╗██╗███╗   ██╗      ████████╗██╗   ██╗██╗",
  "████╗ ████║██║╚██╗██╔╝██║████╗  ██║      ╚══██╔══╝██║   ██║██║",
  "██╔████╔██║██║ ╚███╔╝ ██║██╔██╗ ██║         ██║   ██║   ██║██║",
  "██║╚██╔╝██║██║ ██╔██╗ ██║██║╚██╗██║         ██║   ██║   ██║██║",
  "██║ ╚═╝ ██║██║██╔╝ ██╗██║██║ ╚████║         ██║   ╚██████╔╝██║",
  "╚═╝     ╚═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝         ╚═╝    ╚═════╝ ╚═╝",
];

export const HomeScreen: React.FC<{
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ items, onSelect, inputEnabled, setCommandHints }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pulseFrame, setPulseFrame] = useState(0);

  useEffect(() => {
    setCommandHints("ARROWS -> Choose, ENTER -> Open, Q -> Quit, / -> Commands");
  }, [setCommandHints]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Bottom-to-top color cycle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseFrame((f) => (f + 1) % ALL_GRADIENTS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

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

  const getLogoColor = (lineIndex: number): string => {
    // Multi-palette cycle from bottom to top
    const offset = ((HOME_LOGO.length - 1 - lineIndex) + pulseFrame) % ALL_GRADIENTS.length;
    return ALL_GRADIENTS[offset];
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box flexDirection="column" marginBottom={2} alignItems="center">
        {HOME_LOGO.map((line, i) => (
          <Text key={i} color={getLogoColor(i)} bold>
            {line}
          </Text>
        ))}
        <Box marginTop={1}>
          <Text color={THEME.muted}>
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={THEME.textDim}>
            The terminal client for Mixin Network
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={THEME.primary}
        paddingX={3}
        paddingY={1}
        width={46}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Box key={item.value} marginBottom={index < items.length - 1 ? 1 : 0}>
              <Box>
                <Text color={isSelected ? THEME.secondaryLight : THEME.borderDim}>
                  {isSelected ? "▸" : " "}
                </Text>
                <Text> </Text>
                <Text
                  color={isSelected ? THEME.text : THEME.textDim}
                  bold={isSelected}
                  backgroundColor={isSelected ? THEME.highlight : undefined}
                >
                  {item.label}
                </Text>
              </Box>
              <Box width="fill" justifyContent="flex-end">
                <Text color={isSelected ? THEME.muted : THEME.borderDim}>
                  {isSelected ? "[ENTER]" : "       "}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
