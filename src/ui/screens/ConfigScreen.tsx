import React, { useCallback, useEffect, useState } from "react";
import { Text } from "ink";
import { FormView } from "../components/FormView.js";
import { MenuScreen } from "./MenuScreen.js";
import {
  listStoredConfigs,
  removeStoredConfig,
  saveStoredConfigFromJson,
} from "../../mixin/configStore.js";
import { THEME } from "../theme.js";
import type { StatusState } from "../types.js";

type ConfigSelection = {
  path: string;
  label: string;
};

export const ConfigSwitchScreen: React.FC<{
  onSelect: (selection: ConfigSelection) => void;
  onCancel: () => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
  setStatus: (state: StatusState, message: string) => void;
}> = ({ onSelect, onCancel, inputEnabled, setCommandHints, setStatus }) => {
  const [configs, setConfigs] = useState<Array<{ label: string; path: string }>>([]);
  const [selectedConfig, setSelectedConfig] = useState<{
    label: string;
    path: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "add" | "options" | "confirm_remove">(
    "list"
  );

  const refreshConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const entries = await listStoredConfigs();
      setConfigs(entries);
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [setStatus]);

  useEffect(() => {
    if (!inputEnabled) return;
    void refreshConfigs();
  }, [refreshConfigs, inputEnabled]);

  if (!inputEnabled) {
    return <Text color={THEME.muted}>Loading...</Text>;
  }

  if (mode === "options" && selectedConfig) {
    return (
      <MenuScreen
        title={`Manage ${selectedConfig.label}`}
        items={[
          { label: "Switch to this bot", value: "switch" },
          { label: "Remove", value: "remove" },
          { label: "Back", value: "back" },
        ]}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
        onBack={() => {
          setMode("list");
          setSelectedConfig(null);
        }}
        onSelect={(item) => {
          if (item.value === "switch") {
            onSelect(selectedConfig);
          } else if (item.value === "remove") {
            setMode("confirm_remove");
          } else {
            setMode("list");
            setSelectedConfig(null);
          }
        }}
      />
    );
  }

  if (mode === "confirm_remove" && selectedConfig) {
    return (
      <MenuScreen
        title={`Delete ${selectedConfig.label}?`}
        items={[
          { label: "No, keep it", value: "no" },
          { label: "Yes, delete permanently", value: "yes" },
        ]}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
        onBack={() => setMode("options")}
        onSelect={async (item) => {
          if (item.value === "yes") {
            try {
              setStatus("loading", "Removing config...");
              await removeStoredConfig(selectedConfig.label);
              await refreshConfigs();
              setMode("list");
              setSelectedConfig(null);
              setStatus("idle", "Ready");
            } catch (error) {
              setStatus(
                "error",
                error instanceof Error ? error.message : String(error)
              );
              setMode("options");
            }
          } else {
            setMode("options");
          }
        }}
      />
    );
  }

  if (mode === "add") {
    return (
      <FormView
        title="Add Bot"
        fields={[
          {
            key: "botId",
            label: "Bot ID",
            placeholder: "e.g. 7000100001",
          },
          {
            key: "keystoreJson",
            label: "Keystore JSON",
            placeholder: "Paste JSON keystore",
            type: "textarea",
          },
        ]}
        helpText="ENTER = NEXT/SAVE, ESC = BACK"
        onSubmit={async (values) => {
          if (!inputEnabled) return;
          setStatus("loading", "Saving bot config...");
          try {
            const entry = await saveStoredConfigFromJson({
              label: values.botId ?? "",
              rawJson: values.keystoreJson ?? "",
            });
            await refreshConfigs();
            setMode("list");
            onSelect({ path: entry.path, label: entry.label });
          } catch (error) {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
          }
        }}
        onCancel={() => setMode("list")}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
      />
    );
  }

  if (loading) {
    return <Text color={THEME.muted}>Loading saved configs...</Text>;
  }

  const items = [
    ...configs.map((config) => ({ label: config.label, value: config.label })),
    { label: "Add Bot", value: "__add" },
    { label: "Back", value: "__back" },
  ];

  return (
    <MenuScreen
      title="Manage Bots"
      items={items}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onBack={onCancel}
      onSelect={(item) => {
        if (item.value === "__add") {
          setMode("add");
          return;
        }
        if (item.value === "__back") {
          onCancel();
          return;
        }
        const selected = configs.find((config) => config.label === item.value);
        if (selected) {
          setSelectedConfig(selected);
          setMode("options");
        }
      }}
    />
  );
};
