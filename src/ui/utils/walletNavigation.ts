import type { Route } from "../types.js";
import BigNumber from "bignumber.js";

type BuildWalletSnapshotsRouteInput = {
  assetId: string;
  symbol: string;
  balance: string;
};

export const buildWalletSnapshotsRouteForAsset = (
  input: BuildWalletSnapshotsRouteInput
): Extract<Route, { id: "wallet-snapshots" }> => ({
  id: "wallet-snapshots",
  filters: {
    assetId: input.assetId,
  },
  title: `${input.symbol} snapshots\nBalance: ${new BigNumber(input.balance).toFixed()}`,
});
