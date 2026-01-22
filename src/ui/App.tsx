import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Box, Text, Spacer, useApp, useInput, useStdout } from "ink";
import imageToAscii from "image-to-ascii";
import BigNumber from "bignumber.js";
import type { AssetResponse, SafeAsset, SafeSnapshotsRequest } from "@mixin.dev/mixin-node-sdk";
import { loadConfig } from "../mixin/config.js";
import { createMixinClient } from "../mixin/client.js";
import { createServices, type MixinServices } from "../mixin/services/index.js";
import { MenuList, type MenuItem } from "./components/MenuList.js";
import { FormView } from "./components/FormView.js";
import { FormattedView } from "./components/JsonView.js";
import { THEME } from "./theme.js";

type StatusState = "idle" | "loading" | "success" | "error";

type SnapshotFilters = {
  assetId?: string;
  opponentId?: string;
  limit?: string;
  offset?: string;
};

type Route =
  | { id: "home" }
  | { id: "wallet-menu" }
  | { id: "wallet-assets" }
  | { id: "wallet-snapshots"; filters?: SnapshotFilters }
  | { id: "wallet-snapshot-filter"; filters?: SnapshotFilters }
  | { id: "transfer-menu" }
  | { id: "transfer-to-user" }
  | { id: "transfer-refund" }
  | { id: "user-menu" }
  | { id: "user-profile" }
  | { id: "user-fetch" }
  | { id: "network-menu" }
  | { id: "network-top-assets" }
  | { id: "safe-menu" }
  | { id: "safe-assets" }
  | { id: "messages-menu" }
  | { id: "messages-send-text" }
  | { id: "messages-stream" }
  | { id: "config-switch" }
  | { id: "result"; title: string; data: unknown };

type WalletBalance = {
  assetId: string;
  symbol?: string;
  name?: string;
  balance: string;
  iconUrl?: string;
};

type Nav = {
  push: (route: Route) => void;
  pop: () => void;
  replace: (route: Route) => void;
  reset: (route: Route) => void;
};

const StatusBar: React.FC<{ status: StatusState; message: string }> = ({
  status,
  message,
}) => {
  const color =
    status === "error"
      ? THEME.error
      : status === "success"
        ? THEME.success
        : status === "loading"
          ? THEME.warning
          : THEME.primary;

  return (
    <Box borderStyle="single" borderColor={THEME.muted} paddingX={1}>
      <Text color={color} bold>
        {status.toUpperCase()}
      </Text>
      <Spacer />
      <Text color={THEME.text}>{message}</Text>
    </Box>
  );
};

const Header: React.FC<{ configPath: string }> = ({ configPath }) => (
  <Box
    borderStyle="double"
    borderColor={THEME.primary}
    paddingX={2}
    justifyContent="space-between"
  >
    <Box>
      <Text color={THEME.primary} bold>
        MIXIN
      </Text>
      <Text color={THEME.secondary}>TUI</Text>
    </Box>
    <Box>
      <Text color={THEME.muted}>
        {configPath ? `Config: ${configPath}` : "No Config Loaded"}
      </Text>
    </Box>
  </Box>
);

const CommandsView: React.FC = () => (
  <Box flexDirection="column" paddingX={1}>
    <Box marginBottom={1}>
      <Text bold underline color={THEME.text}>
        Commands and Shortcuts
      </Text>
    </Box>
    <Text color={THEME.muted}>/ Open commands (from Home)</Text>
    <Text color={THEME.muted}>Ctrl+P Toggle commands</Text>
    <Text color={THEME.muted}>Up/Down Navigate lists</Text>
    <Text color={THEME.muted}>Enter Select or submit</Text>
    <Text color={THEME.muted}>Esc Go back or cancel</Text>
    <Text color={THEME.muted}>Q Quit (from Home)</Text>
  </Box>
);

const MenuScreen: React.FC<{
  title: string;
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  onBack?: () => void;
  inputEnabled: boolean;
}> = ({ title, items, onSelect, onBack, inputEnabled }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useInput((input, key) => {
    if (!inputEnabled) return;

    if (key.escape && onBack) {
      onBack();
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
    if (key.return && items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <MenuList title={title} items={items} selectedIndex={selectedIndex} />
  );
};

const ResultScreen: React.FC<{
  title: string;
  data: unknown;
  onBack: () => void;
  inputEnabled: boolean;
}> = ({ title, data, onBack, inputEnabled }) => {
  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape || key.return || key.backspace) {
      onBack();
    }
  });

  return <FormattedView title={title} data={data} />;
};

const ConfigSwitchScreen: React.FC<{
  onSubmit: (path: string) => void;
  onCancel: () => void;
  inputEnabled: boolean;
}> = ({ onSubmit, onCancel, inputEnabled }) => {
  if (!inputEnabled) {
    return <Text color={THEME.muted}>Loading...</Text>;
  }
  return (
    <FormView
      title="Switch Config"
      fields={[
        {
          key: "configPath",
          label: "Config Path",
          placeholder: "/path/to/mixin-config.json",
        },
      ]}
      onSubmit={(values) => onSubmit(values.configPath ?? "")}
      onCancel={onCancel}
      inputEnabled={inputEnabled}
    />
  );
};

const WalletAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  type WalletBalance = Awaited<
    ReturnType<MixinServices["wallet"]["listBalances"]>
  >[number];
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const fetchingRef = useRef(new Set<string>());
  const fetchRequestRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cancelBalanceFetch = () => {
    fetchRequestRef.current += 1;
    setStatus("idle", "Ready");
  };

  useEffect(() => {
    if (!services) return;
    const requestId = (fetchRequestRef.current += 1);
    setStatus("loading", "Fetching balances...");
    services.wallet
      .listBalances()
      .then((data) => {
        if (requestId !== fetchRequestRef.current) return;
        setBalances(data);
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        if (requestId !== fetchRequestRef.current) return;
        setStatus("error", error instanceof Error ? error.message : String(error));
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

  return (
    <MenuList title="Wallet Balances" items={items} selectedIndex={selectedIndex} />
  );
};

const WalletAssetDetailForm: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch asset detail.</Text>;
  }

  return (
    <FormView
      title="Asset Detail"
      fields={[{ key: "assetId", label: "Asset ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
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

const WalletSnapshotFilterForm: React.FC<{
  nav: Nav;
  defaultFilters?: SnapshotFilters;
  inputEnabled: boolean;
}> = ({ nav, defaultFilters, inputEnabled }) => {
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

const WalletSnapshotsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  filters?: SnapshotFilters;
  inputEnabled: boolean;
  maxItems?: number;
}> = ({ services, nav, setStatus, filters, inputEnabled, maxItems }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fetchRequestRef = useRef(0);
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

  const loadSnapshots = () => {
    if (!services) return;
    const requestId = (fetchRequestRef.current += 1);
    setStatus("loading", "Fetching snapshots...");
    services.safe
      .listSnapshotsWithAssets(request)
      .then((snapshots) => {
        if (requestId !== fetchRequestRef.current) return;
        const mapped = snapshots.map((snapshot) => ({
          label: `${new BigNumber(snapshot.amount).toFixed()} ${snapshot.asset_symbol ?? snapshot.asset_id}`,
          value: snapshot.snapshot_id,
          description: `${formatTimestamp(snapshot.created_at)}  ${snapshot.type}`,
        }));
        setItems(mapped);
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        if (requestId !== fetchRequestRef.current) return;
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  };

  useEffect(() => {
    loadSnapshots();
    return () => {
      fetchRequestRef.current += 1;
    };
  }, [services, request]);

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
          nav.push({ id: "result", title: "Snapshot Detail", data: snapshot });
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

  return (
    <MenuList
      title="Snapshots (f = filter, r = refresh)"
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No snapshots"
      maxItems={maxItems}
    />
  );
};

const WalletSnapshotDetailForm: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch snapshot detail.</Text>;
  }

  return (
    <FormView
      title="Snapshot Detail"
      fields={[{ key: "snapshotId", label: "Snapshot ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Fetching snapshot detail...");
        services.safe
          .snapshotDetail(values.snapshotId ?? "")
          .then((snapshot) => {
            nav.push({ id: "result", title: "Snapshot Detail", data: snapshot });
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

const TransferToUserScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to send transfers.</Text>;
  }

  return (
    <FormView
      title="Transfer to User"
      fields={[
        { key: "assetId", label: "Asset ID", placeholder: "UUID" },
        { key: "opponentId", label: "Opponent ID", placeholder: "UUID" },
        { key: "amount", label: "Amount", placeholder: "0.0" },
        { key: "memo", label: "Memo", placeholder: "Optional" },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
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
            nav.push({ id: "result", title: "Transfer Result", data: result });
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

const RefundScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to refund transfers.</Text>;
  }

  return (
    <FormView
      title="Refund Transfer"
      fields={[{ key: "snapshotId", label: "Snapshot ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Refunding transfer...");
        services.transfer
          .refundSnapshot(values.snapshotId ?? "")
          .then((result) => {
            nav.push({ id: "result", title: "Refund Result", data: result });
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

const UserProfileScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  const [data, setData] = useState<unknown | null>(null);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Fetching profile...");
    services.user
      .profile()
      .then((profile) => {
        setData(profile);
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  }, [services, setStatus]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape || key.return || key.backspace) {
      nav.pop();
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch profile.</Text>;
  }
  if (!data) {
    return <Text color={THEME.muted}>Loading profile...</Text>;
  }

  return <FormattedView title="My Profile" data={data} />;
};

const UserFetchScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch users.</Text>;
  }

  return (
    <FormView
      title="Fetch User"
      fields={[{ key: "userId", label: "User ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Fetching user...");
        services.user
          .fetch(values.userId ?? "")
          .then((user) => {
            nav.push({ id: "result", title: "User Detail", data: user });
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

const NetworkAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [raw, setRaw] = useState<AssetResponse[]>([]);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Fetching network assets...");
    services.network
      .topAssets()
      .then((assets) => {
        setRaw(assets);
        setItems(
          assets.map((asset, index) => ({
            label: `${asset.symbol ?? "?"}  ${asset.price_usd ?? ""}`,
            value: asset.asset_id ?? String(index),
            description: asset.name ?? "",
          }))
        );
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  }, [services, setStatus]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
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
    if (key.return && raw[selectedIndex]) {
      nav.push({
        id: "result",
        title: "Network Asset",
        data: raw[selectedIndex],
      });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch network assets.</Text>;
  }

  return (
    <MenuList
      title="Network Top Assets"
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No assets"
    />
  );
};

const SafeAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [raw, setRaw] = useState<SafeAsset[]>([]);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Fetching safe assets...");
    services.safe
      .assets()
      .then((assets) => {
        setRaw(assets);
        setItems(
          assets.map((asset, index) => ({
            label: `${asset.symbol ?? "?"}`,
            value: asset.asset_id ?? String(index),
            description: asset.name ?? "",
          }))
        );
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  }, [services, setStatus]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
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
    if (key.return && raw[selectedIndex]) {
      nav.push({ id: "result", title: "Safe Asset", data: raw[selectedIndex] });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch safe assets.</Text>;
  }

  return (
    <MenuList
      title="Safe Assets"
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No assets"
    />
  );
};

const MessagesSendTextScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to send messages.</Text>;
  }

  return (
    <FormView
      title="Send Text Message"
      fields={[
        { key: "userId", label: "User ID", placeholder: "UUID" },
        { key: "text", label: "Message", placeholder: "Text" },
      ]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Sending message...");
        services.messages
          .sendText(values.userId ?? "", values.text ?? "")
          .then((result) => {
            nav.push({ id: "result", title: "Message Result", data: result });
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

const MessagesStreamScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
}> = ({ services, nav, setStatus, inputEnabled }) => {
  type StreamMessage = {
    id: string;
    userId: string;
    category: string;
    content: string;
    createdAt: string;
  };

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const fetchedUsers = useRef<Set<string>>(new Set());

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Connecting to message stream...");
    
    setMessages([]);
    
    services.messages.startStream({
      onMessage: (message: any) => {
        let content = "";
        if (message.category === "PLAIN_TEXT") {
          content = typeof message.data === "string" ? message.data : JSON.stringify(message.data);
        } else if (message.category === "SYSTEM_ACCOUNT_SNAPSHOT") {
             const data = message.data;
             const amount = data.amount || "?";
             const symbol = data.asset?.symbol || "Asset";
             content = `Transfer: ${amount} ${symbol}`;
        } else {
          content = `[${message.category}]`;
        }

        const newMsg: StreamMessage = {
          id: message.message_id,
          userId: message.user_id,
          category: message.category,
          content: content,
          createdAt: message.created_at,
        };

        setMessages((prev) => [...prev, newMsg].slice(-50));

        if (!fetchedUsers.current.has(message.user_id)) {
          fetchedUsers.current.add(message.user_id);
          
          services.user
            .fetch(message.user_id)
            .then((user) => {
              setUserMap((prev) => ({
                ...prev,
                [user.user_id]: user.full_name,
              }));
            })
            .catch(() => {
              fetchedUsers.current.delete(message.user_id);
            });
        }
      },
    });
    setStatus("idle", "Listening for messages");
    return () => {
      services.messages.stopStream();
      setStatus("idle", "Ready");
    };
  }, [services, setStatus]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape || key.return) {
      nav.pop();
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to stream messages.</Text>;
  }

  const displayMessages = messages.slice(-15);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderColor={THEME.muted}>
        <Text bold underline color={THEME.text}>
          Message Stream (Esc to stop)
        </Text>
      </Box>
      {messages.length === 0 ? (
        <Text color={THEME.muted}>Waiting for messages...</Text>
      ) : (
        <Box flexDirection="column">
          {displayMessages.map((msg) => {
            const senderName = userMap[msg.userId] || msg.userId.slice(0, 8);
            return (
              <Box key={msg.id} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={THEME.muted}>[{formatTime(msg.createdAt)}] </Text>
                  <Text color={THEME.primary} bold>
                    {senderName}:{" "}
                  </Text>
                </Box>
                <Box paddingLeft={2}>
                  <Text color={THEME.text}>{msg.content}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export const App: React.FC = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });

  const [services, setServices] = useState<MixinServices | null>(null);
  const [status, setStatus] = useState<StatusState>("loading");
  const [message, setMessage] = useState("Initializing...");
  const [configPath, setConfigPath] = useState("default");
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [routeStack, setRouteStack] = useState<Route[]>([{ id: "home" }]);

  const currentRoute = routeStack[routeStack.length - 1];

  const nav = useMemo<Nav>(
    () => ({
      push: (route) => setRouteStack((stack) => [...stack, route]),
      pop: () =>
        setRouteStack((stack) =>
          stack.length > 1 ? stack.slice(0, -1) : stack
        ),
      replace: (route) =>
        setRouteStack((stack) => [...stack.slice(0, -1), route]),
      reset: (route) => setRouteStack([route]),
    }),
    []
  );

  const setStatusMessage = useCallback(
    (state: StatusState, nextMessage: string) => {
      setStatus(state);
      setMessage(nextMessage);
    },
    []
  );

  const loadConfiguration = async (path?: string) => {
    setStatusMessage("loading", `Loading config from ${path || "default"}...`);
    try {
      const config = await loadConfig(path);
      const client = createMixinClient(config);
      setServices(createServices(client, config));
      setConfigPath(path || "default");
      setStatusMessage("idle", "Ready");
    } catch (error) {
      setServices(null);
      setStatusMessage(
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      setDimensions({ columns: stdout.columns, rows: stdout.rows });
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  useEffect(() => {
    loadConfiguration();
  }, []);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (key.ctrl && input === "p") {
      setCommandsVisible((visible) => !visible);
      return;
    }
    if (commandsVisible) {
      if (key.escape || key.return || input === "q") {
        setCommandsVisible(false);
      }
      return;
    }
    if (currentRoute.id === "home" && input === "/") {
      setCommandsVisible(true);
      return;
    }
    if (currentRoute.id === "home" && input === "q") {
      exit();
    }
  });

  const helpText = "[Up/Down] Nav [Enter] Select [Esc] Back [Q] Quit [Ctrl+P] Cmds";

  const renderScreen = () => {
    const inputEnabled = !commandsVisible;
    switch (currentRoute.id) {
      case "home": {
        const items: MenuItem[] = [
          { label: "Wallet", value: "wallet" },
          { label: "Transfer", value: "transfer" },
          { label: "User", value: "user" },
          { label: "Network", value: "network" },
          { label: "Safe", value: "safe" },
          { label: "Messages", value: "messages" },
          { label: "Switch Config", value: "config" },
          { label: "Quit", value: "quit" },
        ];
        return (
          <MenuScreen
            title="Main Menu"
            items={items}
            inputEnabled={inputEnabled}
            onSelect={(item) => {
              switch (item.value) {
                case "wallet":
                  nav.push({ id: "wallet-menu" });
                  break;
                case "transfer":
                  nav.push({ id: "transfer-menu" });
                  break;
                case "user":
                  nav.push({ id: "user-menu" });
                  break;
                case "network":
                  nav.push({ id: "network-menu" });
                  break;
                case "safe":
                  nav.push({ id: "safe-menu" });
                  break;
                case "messages":
                  nav.push({ id: "messages-menu" });
                  break;
                case "config":
                  nav.push({ id: "config-switch" });
                  break;
                case "quit":
                  exit();
                  break;
              }
            }}
          />
        );
      }
      case "wallet-menu": {
        const items: MenuItem[] = [
          { label: "Balances", value: "balances" },
          { label: "Snapshots", value: "snapshots" },
          { label: "Refund", value: "refund" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Wallet"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              switch (item.value) {
                case "balances":
                  nav.push({ id: "wallet-assets" });
                  break;
                case "snapshots":
                  nav.push({ id: "wallet-snapshots" });
                  break;
                case "refund":
                  nav.push({ id: "transfer-refund" });
                  break;
                case "back":
                  nav.pop();
                  break;
              }
            }}
          />
        );
      }
      case "wallet-assets":
        return (
          <WalletAssetsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "wallet-snapshot-filter":
        return (
          <WalletSnapshotFilterForm
            nav={nav}
            defaultFilters={currentRoute.filters}
            inputEnabled={inputEnabled}
          />
        );
      case "wallet-snapshots": {
        const listMaxItems = Math.max(3, Math.floor((dimensions.rows - 16) / 2));
        return (
          <WalletSnapshotsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            filters={currentRoute.filters}
            inputEnabled={inputEnabled}
            maxItems={listMaxItems}
          />
        );
      }
      case "transfer-menu": {
        const items: MenuItem[] = [
          { label: "Transfer to User", value: "to-user" },
          { label: "Refund", value: "refund" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Transfer"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              switch (item.value) {
                case "to-user":
                  nav.push({ id: "transfer-to-user" });
                  break;
                case "refund":
                  nav.push({ id: "transfer-refund" });
                  break;
                case "back":
                  nav.pop();
                  break;
              }
            }}
          />
        );
      }
      case "transfer-to-user":
        return (
          <TransferToUserScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "transfer-refund":
        return (
          <RefundScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "user-menu": {
        const items: MenuItem[] = [
          { label: "My Profile", value: "profile" },
          { label: "Fetch User", value: "fetch" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="User"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              switch (item.value) {
                case "profile":
                  nav.push({ id: "user-profile" });
                  break;
                case "fetch":
                  nav.push({ id: "user-fetch" });
                  break;
                case "back":
                  nav.pop();
                  break;
              }
            }}
          />
        );
      }
      case "user-profile":
        return (
          <UserProfileScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "user-fetch":
        return (
          <UserFetchScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "network-menu": {
        const items: MenuItem[] = [
          { label: "Top Assets", value: "top" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Network"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "top") nav.push({ id: "network-top-assets" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "network-top-assets":
        return (
          <NetworkAssetsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "safe-menu": {
        const items: MenuItem[] = [
          { label: "Safe Assets", value: "assets" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Safe"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "assets") nav.push({ id: "safe-assets" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "safe-assets":
        return (
          <SafeAssetsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "messages-menu": {
        const items: MenuItem[] = [
          { label: "Send Text", value: "send-text" },
          { label: "Stream", value: "stream" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Messages"
            items={items}
            inputEnabled={inputEnabled}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "send-text")
                nav.push({ id: "messages-send-text" });
              if (item.value === "stream") nav.push({ id: "messages-stream" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "messages-send-text":
        return (
          <MessagesSendTextScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "messages-stream":
        return (
          <MessagesStreamScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
      case "config-switch":
        return (
          <ConfigSwitchScreen
            inputEnabled={inputEnabled}
            onCancel={() => nav.pop()}
            onSubmit={async (path) => {
              await loadConfiguration(path);
              nav.reset({ id: "home" });
            }}
          />
        );
      case "result":
        return (
          <ResultScreen
            title={currentRoute.title}
            data={currentRoute.data}
            onBack={() => nav.pop()}
            inputEnabled={inputEnabled}
          />
        );
    }
  };

  return (
    <Box
      flexDirection="column"
      width={dimensions.columns}
      height={dimensions.rows}
      borderStyle="round"
      borderColor={THEME.primary}
      padding={1}
    >
      <Header configPath={configPath} />
      <Spacer />
      <Box minHeight={12} borderStyle="single" borderColor={THEME.muted} paddingY={1}>
        {commandsVisible ? <CommandsView /> : renderScreen()}
      </Box>
      <Spacer />
      <StatusBar status={status} message={message} />
      <Box marginTop={1} paddingX={1}>
        <Text color={THEME.muted}>{helpText}</Text>
      </Box>
    </Box>
  );
};
