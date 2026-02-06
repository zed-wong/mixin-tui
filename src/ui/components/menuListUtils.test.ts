import { expect, test } from "bun:test";
import { getMenuItemMargin } from "./menuListUtils.js";

test("returns gap for non-last menu items", () => {
  expect(getMenuItemMargin({ index: 0, total: 3, itemGap: 1 })).toBe(1);
});

test("returns 0 for last menu item", () => {
  expect(getMenuItemMargin({ index: 2, total: 3, itemGap: 1 })).toBe(0);
});

test("returns 0 when gap is not set", () => {
  expect(getMenuItemMargin({ index: 0, total: 3, itemGap: undefined })).toBe(0);
});
