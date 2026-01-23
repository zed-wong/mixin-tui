import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { FormView } from "../components/FormView.js";
import { saveStoredConfigFromJson } from "../../mixin/configStore.js";
import { THEME } from "../theme.js";
import type { StatusState } from "../types.js";

type OnboardingSelection = {
  path: string;
  label: string;
};

type OnboardingMode = "intro" | "steps" | "add" | "help";

// ASCII art logo for Mixin TUI
const LOGO = [
  "  ___  __  __  ____",
  " / __)(  )(  )(    \\",
  "( (__  )(__)(  ) D (",
  " \\___)(______)(____/)",
];

const FEATURES = [
  { icon: "●", label: "Manage wallet assets and snapshots" },
  { icon: "●", label: "Send transfers to any user" },
  { icon: "●", label: "Search network assets and tokens" },
  { icon: "●", label: "Send and receive messages" },
  { icon: "●", label: "Generate OAuth tokens" },
];

const SETUP_STEPS = [
  {
    num: "1",
    title: "Create a Mixin Bot",
    desc: "Visit https://mixin.one/bot and create your bot",
    detail: "You'll get an App ID and can download the keystore",
  },
  {
    num: "2",
    title: "Copy Keystore JSON",
    desc: "From your bot dashboard, copy the keystore file",
    detail: "It contains your bot's authentication credentials",
  },
  {
    num: "3",
    title: "Connect Your Bot",
    desc: "Paste the keystore JSON below to connect",
    detail: "Your config is stored locally in ~/.mixin-tui/configs/",
  },
];

export const OnboardingScreen: React.FC<{
  onComplete: (selection: OnboardingSelection) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
  setStatus: (state: StatusState, message: string) => void;
  onQuit: () => void;
}> = ({
  onComplete,
  inputEnabled,
  setCommandHints,
  setStatus,
  onQuit,
}) => {
  const [mode, setMode] = useState<OnboardingMode>("intro");
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    switch (mode) {
      case "intro":
        setCommandHints("ENTER = Continue, Q = Quit, H = Help");
        break;
      case "steps":
        setCommandHints("ENTER = Add Bot, Q = Quit, H = Help");
        break;
      case "help":
        setCommandHints("ESC = Back, Q = Quit");
        break;
      case "add":
        setCommandHints("ENTER = SAVE & START, ESC = BACK");
        break;
    }
  }, [mode, setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;

    if (input === "q" || input === "Q") {
      onQuit();
      return;
    }

    if (mode === "help" && key.escape) {
      setMode("steps");
      return;
    }

    if (mode === "intro" || mode === "steps") {
      if (key.return) {
        setMode("add");
      }
      if (input === "h" || input === "H") {
        setMode("help");
      }
    }
  });

  if (mode === "add") {
    return (
      <FormView
        title="Connect Your Bot"
        fields={[
          {
            key: "botId",
            label: "Bot ID / Label",
            placeholder: "e.g. 7000100001 (used as config name)",
          },
          {
            key: "keystoreJson",
            label: "Keystore JSON",
            placeholder: "Paste your bot's keystore JSON here...",
            type: "textarea",
          },
        ]}
        helpText="Paste your keystore and press ENTER to save and start"
        onSubmit={async (values) => {
          if (!inputEnabled) return;
          setStatus("loading", "Connecting your bot...");
          try {
            const entry = await saveStoredConfigFromJson({
              label: values.botId ?? "",
              rawJson: values.keystoreJson ?? "",
            });
            setStatus("success", "Bot connected successfully!");
            onComplete({ path: entry.path, label: entry.label });
          } catch (error) {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
            setMode("steps");
          }
        }}
        onCancel={() => setMode("steps")}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
      />
    );
  }

  if (mode === "help") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={THEME.primary}>
            What is Mixin TUI?
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          <Text color={THEME.textDim}>
            Mixin TUI is a terminal user interface for interacting with the
            Mixin Network. It allows you to manage bots, wallets, assets, and
            messages directly from your terminal.
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold color={THEME.secondary}>
            Key Features:
          </Text>
        </Box>

        {FEATURES.map((feature) => (
          <Box key={feature.label} marginBottom={1} paddingLeft={1}>
            <Text color={THEME.primaryLight}>
              {feature.icon}{" "}
            </Text>
            <Text color={THEME.text}>{feature.label}</Text>
          </Box>
        ))}

        <Box marginTop={1}>
          <Text bold color={THEME.secondary}>
            Is my data safe?
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={THEME.textDim}>
            Your bot configurations are stored locally in ~/.mixin-tui/configs/
            {"\n"}No data is sent to external servers except the official Mixin API.
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color={THEME.muted} dimColor>
            Press <Text bold>ESC</Text> to go back, <Text bold>Q</Text> to quit
          </Text>
        </Box>
      </Box>
    );
  }

  if (mode === "steps") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={THEME.primary}>
            Setup Your Bot
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color={THEME.muted}>
            Follow these steps to connect your Mixin bot:
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          {SETUP_STEPS.map((step, idx) => (
            <Box key={idx} marginBottom={1} flexDirection="column">
              <Box>
                <Text bold color={THEME.primaryLight}>
                  {step.num}. {step.title}
                </Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color={THEME.text}>{step.desc}</Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color={THEME.muted} dimColor>
                  {step.detail}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        <Box marginTop={1}>
          <Text color={THEME.muted} dimColor>
            Press <Text bold>ENTER</Text> to add your bot,{" "}
            <Text bold>H</Text> for help, <Text bold>Q</Text> to quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Intro screen (mode === "intro")
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1} flexDirection="column">
        {LOGO.map((line, idx) => (
          <Box key={idx}>
            <Text bold color={
              idx === 0 ? THEME.primaryLight :
              idx === 1 ? THEME.primary :
              idx === 2 ? THEME.info :
              THEME.infoLight
            }>
              {line}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginBottom={1}>
        <Text bold color={THEME.text}>
          Welcome to Mixin TUI
          {".".repeat(Math.floor((animationFrame + 1) / 2))}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={THEME.textDim}>
          A terminal interface for the Mixin Network
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color={THEME.muted}>
          Before we begin, you'll need a Mixin bot configuration.
        </Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Box flexDirection="column">
          {FEATURES.slice(0, 3).map((feature) => (
            <Box key={feature.label} paddingLeft={1}>
              <Text color={THEME.successLight}>{feature.icon}</Text>
              <Text color={THEME.textDim}> {feature.label}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={THEME.muted} dimColor>
          Press <Text bold>ENTER</Text> to get started,{" "}
          <Text bold>H</Text> for help, <Text bold>Q</Text> to quit
        </Text>
      </Box>
    </Box>
  );
};
