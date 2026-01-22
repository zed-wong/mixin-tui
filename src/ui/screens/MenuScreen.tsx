import React, { useEffect, useState } from "react";
import { useInput } from "ink";
import { MenuList, type MenuItem } from "../components/MenuList.js";

type MenuScreenProps = {
  title: string;
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  onBack?: () => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
};

export const MenuScreen: React.FC<MenuScreenProps> = ({
  title,
  items,
  onSelect,
  onBack,
  inputEnabled,
  setCommandHints,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setCommandHints("ARROWS = SELECT, ENTER = CHOOSE" + (onBack ? ", ESC = EXIT" : ""));
  }, [setCommandHints, onBack]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useInput((input, key) => {
    if (!inputEnabled) return;

    if (key.escape && onBack) {
      onBack();
      return;
    }
    if (key.upArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index - 1 + items.length) % items.length);
      return;
    }
    if (key.downArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index + 1) % items.length);
      return;
    }
    if (key.return && items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  });

  return <MenuList title={title} items={items} selectedIndex={selectedIndex} />;
};
