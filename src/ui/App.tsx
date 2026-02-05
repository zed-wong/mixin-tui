import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { createMixinClient } from "../mixin/client.js";
import { listStoredConfigs, loadStoredConfigByLabel } from "../mixin/configStore.js";
import { createServices, type MixinServices } from "../mixin/services/index.js";
import { type MenuItem } from "./components/MenuList.js";
import { CommandsView } from "./layout/CommandsView.js";
import { StatusBar } from "./layout/StatusBar.js";
import { OnboardingScreen } from "./screens/OnboardingScreen.js";
import { AuthTokenScreen } from "./screens/AuthScreen.js";
import { ConfigSwitchScreen } from "./screens/ConfigScreen.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { MenuScreen } from "./screens/MenuScreen.js";
import {
  MessagesSendTextScreen,
  MessagesStreamScreen,
  MessagesGroupCreateScreen,
  MessagesGroupListScreen,
  MessagesGroupChatScreen,
  MessagesGroupSendScreen,
  MessagesSettingsScreen,
} from "./screens/MessageScreens.js";
import {
  NetworkAssetFetchForm,
  NetworkAssetSearchScreen,
  NetworkAssetsScreen,
  SafeAssetsScreen,
} from "./screens/NetworkScreens.js";
import { ConfirmView } from "./components/ConfirmView.js";
import { ResultScreen } from "./screens/ResultScreen.js";
import { UserFetchScreen, UserProfileScreen } from "./screens/UserScreens.js";
import {
  RefundScreen,
  TransferToUserScreen,
  WalletAssetsScreen,
  WalletSnapshotFilterForm,
  WalletSnapshotsScreen,
} from "./screens/WalletScreens.js";
import { THEME } from "./theme.js";
import { copyToClipboard } from "./utils/clipboard.js";
import { buildTxSummary } from "./utils/transactions.js";
import type { Nav, Route, StatusState } from "./types.js";

export const App: React.FC = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });

  const [services, setServices] = useState<MixinServices | null>(null);
  const [status, setStatus] = useState<StatusState>("idle");
  const [message, setMessage] = useState("");
  const [commandHints, setCommandHints] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [backgroundBlazeEnabled, setBackgroundBlazeEnabled] = useState<
    boolean | null
  >(null);
  const [routeStack, setRouteStack] = useState<Route[]>([{ id: "config-switch" }]);

  const currentRoute = routeStack[routeStack.length - 1];
  const formatRouteLabel = (route: Route) => {
    switch (route.id) {
      case "home":
        return null;
      case "onboarding":
        return "Setup";
      case "wallet-menu":
        return "Wallet";
      case "wallet-assets":
        return "Balances";
      case "wallet-snapshots":
        return "Snapshots";
      case "wallet-snapshot-filter":
        return "Snapshot Filters";
      case "transfer-to-user":
        return "Transfer to User";
      case "transfer-refund":
        return "Refund";
      case "refund-confirm":
        return "Confirm Refund";
      case "user-menu":
        return "User";
      case "user-profile":
        return "My Profile";
      case "user-fetch":
        return "Fetch User";
      case "network-menu":
        return "Network";
      case "network-top-assets":
        return "Top Assets";
      case "network-asset-search":
        return "Search Assets";
      case "network-asset-fetch":
        return "Fetch Asset";
      case "safe-menu":
        return "Safe";
      case "safe-assets":
        return "Safe Assets";
      case "auth-token":
        return "Auth Token";
      case "messages-menu":
        return "Messages";
      case "messages-group-menu":
        return "Group Conversations";
      case "messages-group-create":
        return "Create Group";
      case "messages-group-list":
        return "Group List";
      case "messages-group-chat":
        return "Group Chat";
      case "messages-group-send":
        return "Send Group Message";
      case "messages-settings":
        return "Message Settings";
      case "messages-send-text":
        return "Send Text";
      case "messages-stream":
        return "Stream";
      case "config-switch":
        return "Manage Bots";
      case "result":
        return route.title;
      default:
        return null;
    }
  };

  const breadcrumb = routeStack
    .map((route) => formatRouteLabel(route))
    .filter((label): label is string => Boolean(label));
  const headerParts = [
    configPath !== "default" ? `~/${configPath}` : null,
    breadcrumb.length > 0 ? breadcrumb.join(" -> ") : null,
  ].filter(Boolean);
  const headerText = headerParts.join(" · ");
  const statusHints = useMemo(() => {
    if (currentRoute.id === "home") return commandHints;
    const trimmed = commandHints.trim();
    if (trimmed.length === 0) return "ESC -> Exit";
    if (trimmed.toLowerCase().includes("esc")) return trimmed;
    return `${trimmed}, ESC -> Exit`;
  }, [commandHints, currentRoute.id]);

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

  const loadConfiguration = async (label: string) => {
    setStatusMessage("loading", `Loading config for ${label}...`);
    try {
      const { config } = await loadStoredConfigByLabel(label);
      const client = createMixinClient(config);
      setServices(createServices(client, config));
      setConfigPath(label);
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
    const checkInitialRoute = async () => {
      const configs = await listStoredConfigs();
      if (configs.length === 0) {
        setRouteStack([{ id: "onboarding" }]);
        return;
      }
      // Auto-load default bot (prefer "default" label, otherwise first in list)
      const defaultConfig = configs.find((c) => c.label === "default") ?? configs[0];
      await loadConfiguration(defaultConfig.label);
      setRouteStack([{ id: "home" }]);
    };
    void checkInitialRoute();
  }, []);

  useEffect(() => {
    if (!services) return;
    const enabled = services.messages.getBackgroundBlazeEnabled();
    setBackgroundBlazeEnabled(enabled);
  }, [services]);

  useEffect(() => {
    if (!services || backgroundBlazeEnabled === null) return;
    if (!backgroundBlazeEnabled) return;
    services.messages.startConversationStream({});
    return () => {
      services.messages.stopStream();
    };
  }, [services, backgroundBlazeEnabled]);

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

  const renderScreen = () => {
    const inputEnabled = !commandsVisible;
    switch (currentRoute.id) {
      case "home": {
        const items: MenuItem[] = [
          { label: "Wallet", value: "wallet" },
          { label: "Network", value: "network" },
          { label: "User", value: "user" },
          { label: "Messages", value: "messages" },
          { label: "Auth Token", value: "auth" },
          { label: "Manage Bots", value: "config" },
          { label: "Quit", value: "quit" },
        ];
        return (
          <HomeScreen
            items={items}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
            onSelect={(item) => {
              switch (item.value) {
                case "wallet":
                  nav.push({ id: "wallet-menu" });
                  break;
                case "user":
                  nav.push({ id: "user-menu" });
                  break;
                case "network":
                  nav.push({ id: "network-menu" });
                  break;
                case "auth":
                  nav.push({ id: "auth-token" });
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
          { label: "Transfer to User", value: "transfer" },
          { label: "Refund", value: "refund" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Wallet"
            items={items}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              switch (item.value) {
                case "balances":
                  nav.push({ id: "wallet-assets" });
                  break;
                case "snapshots":
                  nav.push({ id: "wallet-snapshots" });
                  break;
                case "transfer":
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
      case "wallet-assets":
        return (
          <WalletAssetsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "wallet-snapshot-filter":
        return (
          <WalletSnapshotFilterForm
            nav={nav}
            defaultFilters={currentRoute.filters}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "wallet-snapshots": {
        const listMaxItems = Math.max(3, dimensions.rows - 10);
        return (
          <WalletSnapshotsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            filters={currentRoute.filters}
            refreshToken={currentRoute.refreshToken}
            inputEnabled={inputEnabled}
            maxItems={listMaxItems}
            setCommandHints={setCommandHints}
          />
        );
      }
      case "auth-token":
        return (
          <AuthTokenScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "transfer-to-user":
        return (
          <TransferToUserScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            assetId={currentRoute.assetId}
            setCommandHints={setCommandHints}
          />
        );
      case "transfer-refund":
        return (
          <RefundScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "refund-confirm": {
        const snapshotData = currentRoute.snapshotData;
        const details = snapshotData
          ? Object.entries(snapshotData).map(([key, value]) => `${key}: ${value}`)
          : [];
        return (
          <ConfirmView
            title="Confirm Refund"
            message="Are you sure you want to refund this transfer?"
            details={details}
            onConfirm={() => {
              if (!services) return;
              setStatusMessage("loading", "Refunding transfer...");
              services.transfer
                .refundSnapshot(currentRoute.refundSnapshotId)
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
                    returnToId: "wallet-snapshots",
                  });
                  setStatusMessage("idle", "Ready");
                })
                .catch((error) => {
                  setStatusMessage(
                    "error",
                    error instanceof Error ? error.message : String(error)
                  );
                });
            }}
            onCancel={() => nav.pop()}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      }
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
            setCommandHints={setCommandHints}
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
            setCommandHints={setCommandHints}
          />
        );
      case "user-fetch":
        return (
          <UserFetchScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "network-menu": {
        const items: MenuItem[] = [
          { label: "Top Assets", value: "top" },
          { label: "Search Assets", value: "search" },
          { label: "Fetch Asset", value: "fetch" },
          { label: "Safe Assets", value: "safe_assets" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Network"
            items={items}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "top") nav.push({ id: "network-top-assets" });
              if (item.value === "search")
                nav.push({ id: "network-asset-search" });
              if (item.value === "fetch") nav.push({ id: "network-asset-fetch" });
              if (item.value === "safe_assets") nav.push({ id: "safe-assets" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "network-top-assets": {
        const listMaxItems = Math.max(3, dimensions.rows - 10);
        return (
          <NetworkAssetsScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            maxItems={listMaxItems}
            setCommandHints={setCommandHints}
          />
        );
      }
      case "network-asset-search": {
        const listMaxItems = Math.max(3, dimensions.rows - 10);
        return (
          <NetworkAssetSearchScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            maxItems={listMaxItems}
            setCommandHints={setCommandHints}
          />
        );
      }
      case "network-asset-fetch": {
        return (
          <NetworkAssetFetchForm
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
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
            setCommandHints={setCommandHints}
          />
        );
      case "messages-menu": {
        const items: MenuItem[] = [
          { label: "Send Text", value: "send-text" },
          { label: "Stream", value: "stream" },
          { label: "Group Conversations", value: "groups" },
          { label: "Settings", value: "settings" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Messages"
            items={items}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "send-text")
                nav.push({ id: "messages-send-text" });
              if (item.value === "stream") nav.push({ id: "messages-stream" });
              if (item.value === "groups") nav.push({ id: "messages-group-menu" });
              if (item.value === "settings") nav.push({ id: "messages-settings" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "messages-group-menu": {
        const items: MenuItem[] = [
          { label: "Create Group", value: "create" },
          { label: "Conversation List", value: "list" },
          { label: "Back", value: "back" },
        ];
        return (
          <MenuScreen
            title="Group Conversations"
            items={items}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
            onBack={() => nav.pop()}
            onSelect={(item) => {
              if (item.value === "create") nav.push({ id: "messages-group-create" });
              if (item.value === "list") nav.push({ id: "messages-group-list" });
              if (item.value === "back") nav.pop();
            }}
          />
        );
      }
      case "messages-group-create":
        return (
          <MessagesGroupCreateScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-group-list":
        return (
          <MessagesGroupListScreen
            services={services}
            nav={nav}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-group-chat":
        return (
          <MessagesGroupChatScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            conversationId={currentRoute.conversationId}
            name={currentRoute.name}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-group-send":
        return (
          <MessagesGroupSendScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            conversationId={currentRoute.conversationId}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-settings":
        return (
          <MessagesSettingsScreen
            nav={nav}
            inputEnabled={inputEnabled}
            backgroundBlazeEnabled={backgroundBlazeEnabled}
            onToggleBackgroundBlaze={() => {
              if (!services) return;
              setBackgroundBlazeEnabled((prev) => {
                const next = prev === null ? true : !prev;
                services.messages.setBackgroundBlazeEnabled(next);
                return next;
              });
            }}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-send-text":
        return (
          <MessagesSendTextScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            initialUserId={currentRoute.userId}
            returnToStream={currentRoute.returnToStream}
            setCommandHints={setCommandHints}
          />
        );
      case "messages-stream":
        return (
          <MessagesStreamScreen
            services={services}
            nav={nav}
            setStatus={setStatusMessage}
            inputEnabled={inputEnabled}
            setCommandHints={setCommandHints}
          />
        );
      case "onboarding":
        return (
          <OnboardingScreen
            inputEnabled={inputEnabled}
            setStatus={setStatusMessage}
            setCommandHints={setCommandHints}
            onQuit={() => exit()}
            onComplete={async ({ label }) => {
              await loadConfiguration(label);
              nav.reset({ id: "home" });
            }}
          />
        );
      case "config-switch":
        return (
          <ConfigSwitchScreen
            inputEnabled={inputEnabled}
            onCancel={() => nav.pop()}
            setStatus={setStatusMessage}
            setCommandHints={setCommandHints}
            onSelect={async ({ label }) => {
              await loadConfiguration(label);
              nav.reset({ id: "home" });
            }}
          />
        );
      case "result":
        const copyText = currentRoute.copyText;
        const resultMaxItems = Math.max(3, dimensions.rows - 10);
        const refundSnapshotId = currentRoute.refundSnapshotId;
        const returnToId = currentRoute.returnToId;
        const refundEnabled =
          refundSnapshotId &&
          (() => {
            const data = currentRoute.data as Record<string, unknown>;
            const amount = Number(data?.amount ?? 0);
            return amount > 0;
          })();
        const handleResultBack = () => {
          if (!returnToId) {
            nav.pop();
            return;
          }
          setRouteStack((stack) => {
            for (let index = stack.length - 1; index >= 0; index -= 1) {
              if (stack[index].id === returnToId) {
                const nextStack = stack.slice(0, index + 1);
                const target = nextStack[index];
                if (target.id === "wallet-snapshots") {
                  nextStack[index] = {
                    ...target,
                    refreshToken: Date.now(),
                  };
                }
                return nextStack;
              }
            }
            return stack.length > 1 ? stack.slice(0, -1) : stack;
          });
        };
        const onRefund =
          refundEnabled && services
            ? () => {
                nav.push({
                  id: "refund-confirm",
                refundSnapshotId,
                snapshotData: currentRoute.data as Record<string, unknown>,
              });
            }
            : undefined;
        return (
          <ResultScreen
            title={currentRoute.title}
            data={currentRoute.data}
            onBack={handleResultBack}
            setCommandHints={setCommandHints}
            onCopy={
              copyText
                ? () => {
                  setStatusMessage("loading", "Copying token...");
                  void copyToClipboard(copyText)
                    .then((copied) => {
                      if (copied) {
                        setStatusMessage("success", "Auth token copied.");
                      } else {
                        setStatusMessage("error", "Clipboard command not available.");
                      }
                    })
                    .catch((error) => {
                      setStatusMessage(
                        "error",
                        error instanceof Error ? error.message : String(error)
                      );
                    });
                }
                : undefined
            }
            inputEnabled={inputEnabled}
            maxItems={resultMaxItems}
            summaryLines={currentRoute.summaryLines}
            onRefund={onRefund}
          />
        );
    }
  };

  return (
    <Box
      flexDirection="column"
      width={dimensions.columns}
      height={dimensions.rows}
      padding={0}
      marginBottom={0}
    >
      <Box flexGrow={1} flexDirection="column" paddingX={1} overflow="hidden">
        {headerText && (
          <Box marginBottom={1}>
            <Text color={THEME.muted} dimColor>
              {headerText}
            </Text>
          </Box>
        )}
        {commandsVisible ? <CommandsView /> : renderScreen()}
      </Box>

      <StatusBar status={status} message={message} commandHints={statusHints} />
    </Box>
  );
};
