import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, useInput } from "ink";
import imageToAscii from "image-to-ascii";
import BigNumber from "bignumber.js";
import type { SafeSnapshotsRequest } from "@mixin.dev/mixin-node-sdk";
import { FormView } from "../components/FormView.js";
import { MenuList, type MenuItem } from "../components/MenuList.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, SnapshotFilters, StatusState } from "../types.js";
import { buildTxSummary } from "../utils/transactions.js";

const SNAPSHOT_CACHE_TTL = 10000;
const snapshotCache = new Map<string, { items: MenuItem[]; timestamp: number }>();

export const WalletAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  type WalletBalance = Awaited<
    ReturnType<MixinServices["wallet"]["listBalances"]>
  >[number];
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const fetchingRef = useRef(new Set<string>());
  const fetchRequestRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setCommandHints("T = TRANSFER, ARROWS = SELECT, ENTER = DETAIL");
  }, [setCommandHints]);

  const cancelBalanceFetch = () => {
    fetchRequestRef.current += 1;
    setStatus("idle", "Ready");
  };

  useEffect(() => {
    if (!services) return;
    const requestId = (fetchRequestRef.current += 1);
    setLoading(true);
    setHasLoaded(false);
    setStatus("loading", "Fetching balances...");
    services.wallet
      .listBalances()
      .then((data) => {
        if (requestId !== fetchRequestRef.current) return;
        setBalances(data);
        setStatus("idle", "Ready");
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((error) => {
        if (requestId !== fetchRequestRef.current) return;
        setStatus("error", error instanceof Error ? error.message : String(error));
        setLoading(false);
        setHasLoaded(true);
      });
    return () => {
      fetchRequestRef.current += 1;
    };
  }, [services, setStatus]);

  useEffect(() => {
    balances.forEach((row) => {
      if (
        row.iconUrl &&
        !iconMap[row.assetId] &&
        !fetchingRef.current.has(row.assetId)
      ) {
        fetchingRef.current.add(row.assetId);
        const options = {
          size: { height: 1 },
        } satisfies Parameters<typeof imageToAscii>[1];
        imageToAscii(row.iconUrl, options, (err, converted) => {
          fetchingRef.current.delete(row.assetId);
          if (!err && converted) {
            setIconMap((prev) => ({
              ...prev,
              [row.assetId]: converted.trim(),
            }));
          }
        });
      }
    });
  }, [balances, iconMap]);

  const items = useMemo<MenuItem[]>(() => {
    return balances.map((row) => ({
      label: `${row.symbol ?? row.assetId}  ${new BigNumber(row.balance).toFixed()}`,
      value: row.assetId,
      description: "",
      icon: iconMap[row.assetId] || (row.symbol ? `[${row.symbol}]` : "[--]"),
    }));
  }, [balances, iconMap]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      cancelBalanceFetch();
      nav.pop();
      return;
    }
    if (key.upArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index - 1 + items.length) % items.length);
      return;
    }
    if (key.downArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index + 1) % items.length);
      return;
    }
    if (input === "t" && items[selectedIndex]) {
      nav.push({ id: "transfer-to-user", assetId: items[selectedIndex].value });
      return;
    }
    if (key.return && items[selectedIndex] && services) {
      setStatus("loading", "Loading asset detail...");
      services.wallet
        .assetDetail(items[selectedIndex].value)
        .then((asset) => {
          nav.push({ id: "result", title: "Asset Detail", data: asset });
          setStatus("idle", "Ready");
        })
        .catch((error) => {
          setStatus("error", error instanceof Error ? error.message : String(error));
        });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to view balances.</Text>;
  }

  if ((loading || !hasLoaded) && items.length === 0) {
    return <Text color={THEME.muted}>Loading balances...</Text>;
  }

  return (
    <MenuList
      title="Wallet Balances"
      items={items}
      selectedIndex={selectedIndex}
    />
  );
};

export const WalletAssetDetailForm: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch asset detail.</Text>;
  }

  return (
    <FormView
      title="Asset Detail"
      fields={[{ key: "assetId", label: "Asset ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Fetching asset detail...");
        services.wallet
          .assetDetail(values.assetId ?? "")
          .then((asset) => {
            nav.push({ id: "result", title: "Asset Detail", data: asset });
            setStatus("idle", "Ready");
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const WalletSnapshotFilterForm: React.FC<{
  nav: Nav;
  defaultFilters?: SnapshotFilters;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ nav, defaultFilters, inputEnabled, setCommandHints }) => {
  if (!inputEnabled) {
    return <Text color={THEME.muted}>Loading...</Text>;
  }
  return (
    <FormView
      title="Snapshot Filters"
      fields={[
        {
          key: "limit",
          label: "Limit",
          placeholder: "20",
          initialValue: defaultFilters?.limit ?? "20",
        },
        {
          key: "offset",
          label: "Offset",
          placeholder: "Optional created_at",
          initialValue: defaultFilters?.offset ?? "",
        },
        {
          key: "assetId",
          label: "Asset ID",
          placeholder: "Optional asset UUID",
          initialValue: defaultFilters?.assetId ?? "",
        },
        {
          key: "opponentId",
          label: "Opponent ID",
          placeholder: "Optional user UUID",
          initialValue: defaultFilters?.opponentId ?? "",
        },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        nav.push({
          id: "wallet-snapshots",
          filters: {
            limit: values.limit,
            offset: values.offset,
            assetId: values.assetId,
            opponentId: values.opponentId,
          },
        });
      }}
    />
  );
};

export const WalletSnapshotsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  filters?: SnapshotFilters;
  inputEnabled: boolean;
  maxItems?: number;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, filters, inputEnabled, maxItems, setCommandHints }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchRequestRef = useRef(0);

  useEffect(() => {
    setCommandHints("F = FILTER, R = REFRESH, ARROWS = SELECT, ENTER = DETAIL");
  }, [setCommandHints]);

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().replace("T", " ").slice(0, 19);
  };

  const request = useMemo<SafeSnapshotsRequest>(() => {
    const limit = Number.parseInt(filters?.limit ?? "20", 10);
    const offset = (filters?.offset ?? "").trim();
    return {
      limit: Number.isNaN(limit) ? 20 : limit,
      offset: offset.length > 0 ? offset : undefined,
      asset: filters?.assetId?.trim() || undefined,
      opponent: filters?.opponentId?.trim() || undefined,
    };
  }, [filters]);

  const requestKey = useMemo(() => JSON.stringify(request), [request]);

  const loadSnapshots = () => {
    if (!services) return;
    const requestId = (fetchRequestRef.current += 1);
    setLoading(true);
    setStatus("loading", "Fetching snapshots...");
    services.safe
      .listSnapshotsWithAssets(request)
      .then((snapshots) => {
        if (requestId !== fetchRequestRef.current) return;
        const mapped = snapshots.map((snapshot) => ({
          label: `${new BigNumber(snapshot.amount).toFixed()} ${
            snapshot.asset_symbol ?? snapshot.asset_id
          }`,
          value: snapshot.snapshot_id,
          description: `${formatTimestamp(snapshot.created_at)}  ${snapshot.type}`,
        }));
        setItems(mapped);
        snapshotCache.set(requestKey, { items: mapped, timestamp: Date.now() });
        setStatus("idle", "Ready");
        setLoading(false);
      })
      .catch((error) => {
        if (requestId !== fetchRequestRef.current) return;
        setStatus("error", error instanceof Error ? error.message : String(error));
        setLoading(false);
      });
  };

  useEffect(() => {
    const cached = snapshotCache.get(requestKey);
    if (cached && Date.now() - cached.timestamp < SNAPSHOT_CACHE_TTL) {
      setItems(cached.items);
      setLoading(false);
      setStatus("idle", "Ready");
      return;
    }
    loadSnapshots();
    return () => {
      fetchRequestRef.current += 1;
    };
  }, [services, requestKey]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
      fetchRequestRef.current += 1;
      setStatus("idle", "Ready");
      nav.pop();
      return;
    }
    if (input === "f") {
      nav.push({ id: "wallet-snapshot-filter", filters });
      return;
    }
    if (input === "r") {
      loadSnapshots();
      return;
    }
    if (key.upArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index - 1 + items.length) % items.length);
      return;
    }
    if (key.downArrow) {
      if (items.length === 0) return;
      setSelectedIndex((index) => (index + 1) % items.length);
      return;
    }
    if (key.return && items[selectedIndex] && services) {
      setStatus("loading", "Loading snapshot detail...");
      services.safe
        .snapshotDetail(items[selectedIndex].value)
        .then((snapshot) => {
          nav.push({
            id: "result",
            title: "Snapshot Detail",
            data: snapshot,
            refundSnapshotId: snapshot.snapshot_id,
          });
          setStatus("idle", "Ready");
        })
        .catch((error) => {
          setStatus("error", error instanceof Error ? error.message : String(error));
        });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to view snapshots.</Text>;
  }

  if (loading && items.length === 0) {
    return <Text color={THEME.muted}>Loading snapshots...</Text>;
  }

  return (
    <MenuList
      title="Snapshots"
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No snapshots"
      maxItems={maxItems}
    />
  );
};

export const WalletSnapshotDetailForm: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch snapshot detail.</Text>;
  }

  return (
    <FormView
      title="Snapshot Detail"
      fields={[{ key: "snapshotId", label: "Snapshot ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Fetching snapshot detail...");
        services.safe
          .snapshotDetail(values.snapshotId ?? "")
          .then((snapshot) => {
            nav.push({
              id: "result",
              title: "Snapshot Detail",
              data: snapshot,
              refundSnapshotId: snapshot.snapshot_id,
            });
            setStatus("idle", "Ready");
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const TransferToUserScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  assetId?: string;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, assetId, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to send transfers.</Text>;
  }

  return (
    <FormView
      title="Transfer to User"
      fields={[
        {
          key: "assetId",
          label: "Asset ID",
          placeholder: "UUID",
          initialValue: assetId ?? "",
        },
        { key: "opponentId", label: "Opponent ID", placeholder: "UUID" },
        { key: "amount", label: "Amount", placeholder: "0.0" },
        { key: "memo", label: "Memo", placeholder: "Optional" },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Sending transfer...");
        services.transfer
          .toUser({
            assetId: values.assetId ?? "",
            opponentId: values.opponentId ?? "",
            amount: values.amount ?? "",
            memo: values.memo ?? "",
          })
          .then((result) => {
            const entry = Array.isArray(result) ? result[0] : result;
            const summaryLines = entry
              ? buildTxSummary(
                  entry as unknown as Record<string, unknown>,
                  values.opponentId ?? ""
                )
              : undefined;
            nav.push({
              id: "result",
              title: "Transfer Result",
              data: result,
              summaryLines,
            });
            setStatus("idle", "Ready");
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};

export const RefundScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to refund transfers.</Text>;
  }

  return (
    <FormView
      title="Refund Transfer"
      fields={[{ key: "snapshotId", label: "Snapshot ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Refunding transfer...");
        services.transfer
          .refundSnapshot(values.snapshotId ?? "")
          .then((result) => {
            const entry = Array.isArray(result) ? result[0] : result;
            const summaryLines = entry
              ? buildTxSummary(entry as unknown as Record<string, unknown>)
              : undefined;
            nav.push({
              id: "result",
              title: "Refund Result",
              data: result,
              summaryLines,
            });
            setStatus("idle", "Ready");
          })
          .catch((error) => {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          });
      }}
    />
  );
};
