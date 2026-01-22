import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Box, Text, Spacer, useApp, useInput, useStdout } from "ink";
import imageToAscii from "image-to-ascii";
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
  | { id: "wallet-asset-detail-form" }
  | { id: "wallet-snapshots"; filters?: SnapshotFilters }
  | { id: "wallet-snapshot-filter"; filters?: SnapshotFilters }
  | { id: "wallet-snapshot-detail-form" }
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
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const fetchingRef = useRef(new Set<string>());
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Fetching balances...");
    services.wallet
      .listBalances()
      .then((data) => {
        setBalances(data as WalletBalance[]);
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  }, [services, setStatus]);

  useEffect(() => {
    balances.forEach((row) => {
      if (
        row.iconUrl &&
        !iconMap[row.assetId] &&
        !fetchingRef.current.has(row.assetId)
      ) {
        fetchingRef.current.add(row.assetId);
        imageToAscii(
          row.iconUrl,
          { size: { height: 1 }, stringify: true } as any,
          (err: unknown, converted: string) => {
            if (!err && converted) {
              setIconMap((prev) => ({ ...prev, [row.assetId]: converted.trim() }));
            }
          }
        );
      }
    });
  }, [balances]);

  const items = useMemo<MenuItem[]>(() => {
    return balances.map((row) => ({
      label: `${row.symbol ?? row.assetId}  ${row.balance}`,
      value: row.assetId,
      description: row.name ?? row.assetId,
      icon: iconMap[row.assetId] || (row.symbol ? `[${row.symbol}]` : "[--]"),
    }));
  }, [balances, iconMap]);

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
}> = ({ services, nav, setStatus, filters, inputEnabled }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    setStatus("loading", "Fetching snapshots...");
    services.wallet
      .listSnapshots(request)
      .then((snapshots) => {
        const mapped = snapshots.map((snapshot) => ({
          label: `${snapshot.type}  ${snapshot.amount}`,
          value: snapshot.snapshot_id,
          description: `${snapshot.created_at}  ${snapshot.asset_id}`,
        }));
        setItems(mapped);
        setStatus("idle", "Ready");
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
      });
  };

  useEffect(() => {
    loadSnapshots();
  }, [services, request]);

  useInput((input, key) => {
    if (!inputEnabled) return;
    if (key.escape) {
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
      services.wallet
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
        services.wallet
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
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!services) return;
    setStatus("loading", "Connecting to message stream...");
    services.messages.startStream({
      onMessage: (message) => {
        const line = JSON.stringify(message);
        setLines((prev) => [...prev, line].slice(-200));
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

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold underline color={THEME.text}>
          Message Stream (Esc to stop)
        </Text>
      </Box>
      {lines.length === 0 ? (
        <Text color={THEME.muted}>Waiting for messages...</Text>
      ) : (
        lines.map((line, index) => (
          <Text key={`${index}-${line}`} color={THEME.text}>
            {line}
          </Text>
        ))
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
          { label: "Asset Detail", value: "asset-detail" },
          { label: "Snapshots", value: "snapshots" },
          { label: "Snapshot Detail", value: "snapshot-detail" },
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
                case "asset-detail":
                  nav.push({ id: "wallet-asset-detail-form" });
                  break;
                case "snapshots":
                  nav.push({ id: "wallet-snapshots" });
                  break;
                case "snapshot-detail":
                  nav.push({ id: "wallet-snapshot-detail-form" });
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
      case "wallet-asset-detail-form":
        return (
          <WalletAssetDetailForm
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
      case "wallet-snapshots":
        return (
          <WalletSnapshotsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            filters={currentRoute.filters}
            inputEnabled={inputEnabled}
          />
        );
      case "wallet-snapshot-detail-form":
        return (
          <WalletSnapshotDetailForm
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
          />
        );
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
