import React from "react";
import { Box, Text } from "ink";
import { THEME } from "../theme.js";

export type MenuItem = {
  label: string;
  value: string;
  description?: string;
  icon?: string;
};

type MenuListProps = {
  title: string;
  items: MenuItem[];
  selectedIndex: number;
  emptyMessage?: string;
};

export const MenuList: React.FC<MenuListProps> = ({
  title,
  items,
  selectedIndex,
  emptyMessage = "No items",
}) => (
  <Box flexDirection="column" paddingX={1}>
    <Box marginBottom={1}>
      <Text bold underline color={THEME.text}>
        {title}
      </Text>
    </Box>
    {items.length === 0 ? (
      <Text color={THEME.muted}>{emptyMessage}</Text>
    ) : (
      items.map((item, index) => (
        <Box key={`${item.value}-${index}`} flexDirection="column">
          <Text color={index === selectedIndex ? THEME.secondary : THEME.muted}>
            {index === selectedIndex ? "> " : "  "}
            {item.icon ? `${item.icon} ` : ""}
            {item.label}
          </Text>
          {item.description ? (
            <Text color={THEME.muted}>  {item.description}</Text>
          ) : null}
        </Box>
      ))
    )}
  </Box>
);
