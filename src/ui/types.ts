export type StatusState = "idle" | "loading" | "success" | "error";

export type SnapshotFilters = {
  assetId?: string;
  opponentId?: string;
  limit?: string;
  offset?: string;
};

export type Route =
  | { id: "home" }
  | { id: "wallet-menu" }
  | { id: "wallet-assets" }
  | { id: "wallet-snapshots"; filters?: SnapshotFilters }
  | { id: "wallet-snapshot-filter"; filters?: SnapshotFilters }
  | { id: "transfer-to-user"; assetId?: string }
  | { id: "transfer-refund" }
  | { id: "user-menu" }
  | { id: "user-profile" }
  | { id: "user-fetch" }
  | { id: "network-menu" }
  | { id: "network-top-assets" }
  | { id: "network-asset-search" }
  | { id: "network-asset-fetch" }
  | { id: "safe-menu" }
  | { id: "safe-assets" }
  | { id: "auth-token" }
  | { id: "messages-menu" }
  | { id: "messages-send-text"; userId?: string; returnToStream?: boolean }
  | { id: "messages-stream" }
  | { id: "config-switch" }
  | {
      id: "result";
      title: string;
      data: unknown;
      copyText?: string;
      summaryLines?: string[];
      refundSnapshotId?: string;
    };

export type Nav = {
  push: (route: Route) => void;
  pop: () => void;
  replace: (route: Route) => void;
  reset: (route: Route) => void;
};
