import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
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
  const { stdout } = useStdout();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pulseFrame, setPulseFrame] = useState(0);
  const [dimensions, setDimensions] = useState({
    columns: stdout.columns,
    rows: stdout.rows,
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        columns: stdout.columns,
        rows: stdout.rows,
      });
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

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

  const isSmallScreen = dimensions.columns < 65 || dimensions.rows < 25;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box flexDirection="column" marginBottom={isSmallScreen ? 1 : 2} alignItems="center">
        {!isSmallScreen ? (
          HOME_LOGO.map((line, i) => (
            <Text key={i} color={getLogoColor(i)} bold>
              {line}
            </Text>
          ))
        ) : (
          <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text color={THEME.primary} bold>MIXIN TUI</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color={THEME.muted}>
            {isSmallScreen 
              ? "━━━━━━━━━━━━━━━━━━━━━━━━" 
              : "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"}
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
        paddingX={isSmallScreen ? 1 : 3}
        paddingY={1}
        width={isSmallScreen ? Math.min(46, dimensions.columns - 2) : 46}
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
