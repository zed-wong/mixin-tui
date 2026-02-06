import BigNumber from "bignumber.js";

type BalanceLike = {
  balance: string;
};

export const filterPositiveBalances = <T extends BalanceLike>(balances: T[]): T[] => {
  return balances.filter((row) => new BigNumber(row.balance).gt(0));
};
