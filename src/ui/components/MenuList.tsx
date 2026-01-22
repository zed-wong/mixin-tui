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
  maxItems?: number;
};

export const MenuList: React.FC<MenuListProps> = ({
  title,
  items,
  selectedIndex,
  emptyMessage = "No items",
  maxItems,
}) => {
  const windowedItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return { start: 0, items };
    }
    const half = Math.floor(maxItems / 2);
    let start = Math.max(0, selectedIndex - half);
    if (start + maxItems > items.length) {
      start = Math.max(0, items.length - maxItems);
    }
    return {
      start,
      items: items.slice(start, start + maxItems),
    };
  }, [items, maxItems, selectedIndex]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold underline color={THEME.text}>
          {title}
        </Text>
      </Box>
      {items.length === 0 ? (
        <Text color={THEME.muted}>{emptyMessage}</Text>
      ) : (
        windowedItems.items.map((item, index) => {
          const actualIndex = windowedItems.start + index;
          return (
            <Box key={`${item.value}-${actualIndex}`} flexDirection="column">
              <Text
                color={
                  actualIndex === selectedIndex ? THEME.secondary : THEME.muted
                }
              >
                {actualIndex === selectedIndex ? "> " : "  "}
                {item.icon ? `${item.icon} ` : ""}
                {item.label}
              </Text>
              {item.description ? (
                <Text color={THEME.muted}>  {item.description}</Text>
              ) : null}
            </Box>
          );
        })
      )}
    </Box>
  );
};
