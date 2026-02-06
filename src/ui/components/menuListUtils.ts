type MenuItemMarginInput = {
  index: number;
  total: number;
  itemGap?: number;
};

export const getMenuItemMargin = ({
  index,
  total,
  itemGap,
}: MenuItemMarginInput): number => {
  if (!itemGap || itemGap <= 0) return 0;
  if (index >= total - 1) return 0;
  return itemGap;
};
