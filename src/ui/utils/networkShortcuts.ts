import type { Route } from "../types.js";

export const getNetworkAssetsShortcutRoute = (
  input: string
): Extract<Route, { id: "network-asset-search" }> | null => {
  if (input.toLowerCase() === "s") {
    return { id: "network-asset-search" };
  }

  return null;
};
