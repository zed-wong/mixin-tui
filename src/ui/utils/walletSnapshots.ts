import BigNumber from "bignumber.js";

type SnapshotMenuLabelInput = {
  amount: string;
  assetSymbol?: string | null;
  assetId: string;
  createdAt: string;
  typeLabel: string;
  snapshotId: string;
};

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().replace("T", " ").slice(0, 19);
};

export const buildSnapshotMenuLabel = ({
  amount,
  assetSymbol,
  assetId,
  createdAt,
  typeLabel,
  snapshotId,
}: SnapshotMenuLabelInput): string => {
  return `${new BigNumber(amount).toFixed()} ${assetSymbol ?? assetId}  ${formatTimestamp(createdAt)}  ${typeLabel}  snapshot_id: ${snapshotId}`;
};
