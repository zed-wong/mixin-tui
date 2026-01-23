import React, { useEffect, useState } from "react";
import { Text, useInput } from "ink";
import type { AssetResponse, SafeAsset } from "@mixin.dev/mixin-node-sdk";
import { FormView } from "../components/FormView.js";
import { MenuList, type MenuItem } from "../components/MenuList.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, StatusState } from "../types.js";

export const NetworkAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  maxItems?: number;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, maxItems, setCommandHints }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [raw, setRaw] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setCommandHints("▲ / ▼ -> Select, ENTER -> Detail, ESC -> Exit");
  }, [setCommandHints]);

  useEffect(() => {
    if (!services) return;
    setLoading(true);
    setHasLoaded(false);
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
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
        setLoading(false);
        setHasLoaded(true);
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
      nav.push({ id: "result", title: "Network Asset", data: raw[selectedIndex] });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch network assets.</Text>;
  }

  if ((loading || !hasLoaded) && items.length === 0) {
    return <Text color={THEME.muted}>Loading network assets...</Text>;
  }

  return (
    <MenuList
      title="Network Top Assets"
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No assets"
      maxItems={maxItems}
    />
  );
};

export const SafeAssetsScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [raw, setRaw] = useState<SafeAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setCommandHints("▲ / ▼ -> Select, ENTER -> Detail, ESC -> Exit");
  }, [setCommandHints]);

  useEffect(() => {
    if (!services) return;
    setLoading(true);
    setHasLoaded(false);
    setStatus("loading", "Fetching safe assets...");
    services.safe
      .assets()
      .then((assets) => {
        setRaw(assets);
          setItems(
            assets.map((asset, index) => ({
              label: `${asset.symbol ?? "?"}  ${asset.price_usd ?? ""}`,
              value: asset.asset_id ?? String(index),
              description: `name: ${asset.name ?? "?"}  asset_id: ${asset.asset_id ?? "?"}  chain_id: ${asset.chain_id ?? "?"}`,
            }))
          );
        setStatus("idle", "Ready");
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
        setLoading(false);
        setHasLoaded(true);
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

  if ((loading || !hasLoaded) && items.length === 0) {
    return <Text color={THEME.muted}>Loading safe assets...</Text>;
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

export const NetworkAssetFetchForm: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch network assets.</Text>;
  }

  return (
    <FormView
      title="Network Asset"
      fields={[{ key: "assetId", label: "Asset ID", placeholder: "UUID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Fetching network asset...");
        services.network
          .fetchAsset(values.assetId ?? "")
          .then((asset) => {
            nav.push({ id: "result", title: "Network Asset", data: asset });
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

export const NetworkAssetSearchScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  maxItems?: number;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, maxItems, setCommandHints }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [raw, setRaw] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (keyword.length === 0) return;
    setCommandHints("▲ / ▼ -> Select, ENTER -> Detail, ESC -> Exit");
  }, [keyword, setCommandHints]);

  useEffect(() => {
    if (!services || !keyword) return;
    setLoading(true);
    setHasLoaded(false);
    setStatus("loading", "Searching assets...");
    services.network
      .searchAssets(keyword)
      .then((assets) => {
        setRaw(assets);
        setItems(
          assets.map((asset, index) => ({
            label: `${asset.symbol ?? "?"}  ${asset.price_usd ?? ""}`,
            value: asset.asset_id ?? String(index),
            description: `name: ${asset.name ?? "?"}  asset_id: ${asset.asset_id ?? "?"}  chain_id: ${asset.chain_id ?? "?"}`,
          }))
        );
        setStatus("idle", "Ready");
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((error) => {
        setStatus("error", error instanceof Error ? error.message : String(error));
        setLoading(false);
        setHasLoaded(true);
      });
  }, [services, keyword, setStatus]);

  useInput((input, key) => {
    if (!inputEnabled || keyword.length === 0) return;
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
      nav.push({ id: "result", title: "Network Asset", data: raw[selectedIndex] });
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to search assets.</Text>;
  }

  if (!keyword) {
    return (
      <FormView
        title="Search Assets"
        fields={[{ key: "keyword", label: "Keyword", placeholder: "Symbol or name" }]}
        onCancel={() => nav.pop()}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
        onSubmit={(values) => {
          if (!inputEnabled) return;
          const nextKeyword = (values.keyword ?? "").trim();
          if (!nextKeyword) {
            setStatus("error", "Keyword is required");
            return;
          }
          setItems([]);
          setRaw([]);
          setSelectedIndex(0);
          setKeyword(nextKeyword);
        }}
      />
    );
  }

  if ((loading || !hasLoaded) && items.length === 0) {
    return <Text color={THEME.muted}>Searching assets...</Text>;
  }

  return (
    <MenuList
      title={`Search Results: ${keyword}`}
      items={items}
      selectedIndex={selectedIndex}
      emptyMessage="No assets found"
      maxItems={maxItems}
    />
  );
};
