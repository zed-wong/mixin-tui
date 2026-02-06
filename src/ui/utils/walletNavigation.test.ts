import { expect, test } from "bun:test";
import { buildWalletSnapshotsRouteForAsset } from "./walletNavigation.js";

test("builds wallet snapshots route filtered by asset", () => {
  expect(
    buildWalletSnapshotsRouteForAsset({
      assetId: "asset-123",
      symbol: "USDT",
      balance: "10.5",
    })
  ).toEqual({
    id: "wallet-snapshots",
    filters: {
      assetId: "asset-123",
    },
    title: "USDT snapshots\nBalance: 10.5",
  });
});
