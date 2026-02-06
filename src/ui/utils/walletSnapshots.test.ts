import { expect, test } from "bun:test";
import { buildSnapshotMenuLabel } from "./walletSnapshots.js";

test("builds snapshot menu content on a single line", () => {
  const line = buildSnapshotMenuLabel({
    amount: "1.23",
    assetSymbol: "USDT",
    assetId: "asset-1",
    createdAt: "2026-02-06T15:00:00.000Z",
    typeLabel: "transfer",
    snapshotId: "snap-1",
  });

  expect(line).toBe("1.23 USDT  2026-02-06 15:00:00  transfer  snapshot_id: snap-1");
});
