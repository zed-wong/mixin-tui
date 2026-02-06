import { expect, test } from "bun:test";
import { filterPositiveBalances } from "./walletBalances.js";

test("filters out zero and negative balances", () => {
  const balances = [
    { assetId: "1", symbol: "CNB", balance: "1" },
    { assetId: "2", symbol: "USDT", balance: "0" },
    { assetId: "3", symbol: "MATIC", balance: "-3" },
    { assetId: "4", symbol: "BTC", balance: "0.0001" },
  ];

  expect(filterPositiveBalances(balances)).toEqual([
    { assetId: "1", symbol: "CNB", balance: "1" },
    { assetId: "4", symbol: "BTC", balance: "0.0001" },
  ]);
});
