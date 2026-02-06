import { expect, test } from "bun:test";
import { formatAssetListLine } from "./assetDisplay.js";

test("formats asset list line as symbol name price assetid", () => {
  const line = formatAssetListLine({
    symbol: "USDT",
    name: "Tether USD",
    priceUsd: "1.0001",
    assetId: "815b0b1a-2764-3736-8faa-42d694fa620a",
  });

  expect(line).toBe("USDT Tether USD 1.0001 815b0b1a-2764-3736-8faa-42d694fa620a");
});
