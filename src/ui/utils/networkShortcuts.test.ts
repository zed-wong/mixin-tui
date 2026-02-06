import { expect, test } from "bun:test";
import { getNetworkAssetsShortcutRoute } from "./networkShortcuts.js";

test("maps s shortcut to network asset search route", () => {
  expect(getNetworkAssetsShortcutRoute("s")).toEqual({ id: "network-asset-search" });
  expect(getNetworkAssetsShortcutRoute("S")).toEqual({ id: "network-asset-search" });
  expect(getNetworkAssetsShortcutRoute("x")).toBeNull();
});
