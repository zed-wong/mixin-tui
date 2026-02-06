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
      <Box
        marginBottom={1}
        borderStyle="round"
        borderColor={THEME.border}
        paddingX={1}
      >
        <Text bold color={THEME.primaryLight}>
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Text>
      </Box>

      {items.length === 0 ? (
        <Box paddingY={2} justifyContent="center">
          <Text color={THEME.mutedDim}>{emptyMessage}</Text>
        </Box>
      ) : (
        windowedItems.items.map((item, index) => {
          const actualIndex = windowedItems.start + index;
          const isSelected = actualIndex === selectedIndex;

          return (
            <Box
              key={`${item.value}-${actualIndex}`}
              flexDirection="column"
              marginBottom={0}
              paddingX={1}
              paddingY={isSelected ? 0 : undefined}
            >
              <Box>
                <Text color={isSelected ? THEME.primaryLight : THEME.borderDim}>
                  {isSelected ? "▸" : " "}
                </Text>
                <Text> </Text>
                <Box flexDirection="column" flexGrow={1}>
                  <Box>
                    <Text
                      color={isSelected ? THEME.text : THEME.textDim}
                      bold={isSelected}
                      backgroundColor={isSelected ? THEME.highlightSecondary : undefined}
                    >
                      {item.icon ? `${item.icon} ` : ""}
                      {item.label}
                    </Text>
                  </Box>
                  {item.description ? (
                    <Box>
                      <Text color={THEME.muted} dimColor>
                        {item.description}
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Box>
          );
        })
      )}

      {/* Page indicator */}
      {maxItems && items.length > maxItems && (
        <Box marginTop={1} justifyContent="center">
          <Text color={THEME.mutedDim}>
            ─ {windowedItems.start + 1}-{windowedItems.start + windowedItems.items.length} of {items.length} ─
          </Text>
        </Box>
      )}
    </Box>
  );
};
