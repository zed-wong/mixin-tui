type AssetDisplayInput = {
  symbol?: string;
  name?: string;
  priceUsd?: string;
  assetId?: string;
};

export const formatAssetListLine = ({
  symbol,
  name,
  priceUsd,
  assetId,
}: AssetDisplayInput): string => {
  return [symbol ?? "?", name ?? "?", priceUsd ?? "?", assetId ?? "?"]
    .map((part) => part.trim())
    .join(" ");
};
