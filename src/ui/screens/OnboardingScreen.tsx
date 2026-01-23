import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { FormView } from "../components/FormView.js";
import { saveStoredConfigFromJson } from "../../mixin/configStore.js";
import { THEME } from "../theme.js";
import type { StatusState } from "../types.js";

type OnboardingSelection = {
  path: string;
  label: string;
};

type OnboardingMode = "intro" | "help" | "add";

// Full ASCII art logo for Mixin TUI
const LOGO = [
  " __  __ _      _       _____ _   _ ___ ",
  "|  \\/  (_)__ _(_)_ _  |_   _| | | |_ _|",
  "| |\\/| | / _` | | ' \\   | | | |_| || | ",
  "|_|  |_|_\\__,_|_|_||_|  |_|  \\___/|___|",
];

// Compact ASCII logo for small screens
const LOGO_SMALL = [
    " __  _ _____ _   _ ___ ",
  "|  \\/  |_   _| | | |_ _|",
  "| |\\/|  | | | |_| || | ",
  "|_|  |_| |_|  \\___/|___|",
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
    desc: "Visit https://developers.mixin.one/dashboard and create your bot",
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
    desc: "Paste the keystore JSON to connect",
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
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });

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

  const isSmallScreen = dimensions.columns < 50 || dimensions.rows < 20;

  useEffect(() => {
    // Only animate on intro screen to avoid interfering with form input
    if (mode !== "intro") return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    switch (mode) {
      case "intro":
        setCommandHints("ENTER -> Continue, Q -> Quit");
        break;
      case "help":
        setCommandHints("ENTER -> Add Bot, ESC -> Back, Q -> Quit");
        break;
      case "add":
        setCommandHints("ENTER -> SAVE & START, ESC -> BACK");
        break;
    }
  }, [mode, setCommandHints]);

  useInput((input, key) => {
    if (!inputEnabled) return;

    if (input === "q" || input === "Q") {
      onQuit();
      return;
    }

    if (mode === "intro") {
      if (key.return) {
        setMode("help");
      }
    }

    if (mode === "help") {
      if (key.return) {
        setMode("add");
      }
      if (key.escape) {
        setMode("intro");
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
            setMode("help");
          }
        }}
        onCancel={() => setMode("help")}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
      />
    );
  }

  if (mode === "help") {
    return (
      <Box flexDirection="column" paddingX={1}>
        {/* Setup Steps section */}
        <Box marginTop={1} marginBottom={1}>
          <Text bold color={THEME.secondary}>
            How to Setup:
          </Text>
        </Box>

        {SETUP_STEPS.map((step) => (
          <Box key={step.num} marginBottom={1} flexDirection="column">
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

        {/* Privacy section */}
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
            Press <Text bold>ENTER</Text> to add bot,{" "}
            <Text bold>ESC</Text> back, <Text bold>Q</Text> to quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Intro screen (mode === "intro")
  const logoToShow = isSmallScreen ? LOGO_SMALL : LOGO;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1} flexDirection="column">
        {logoToShow.map((line, idx) => (
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
          {".".repeat(Math.floor((animationFrame + 3) / 2))}
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
          Press <Text bold>ENTER</Text> to continue,{" "}
          <Text bold>Q</Text> to quit
        </Text>
      </Box>
    </Box>
  );
};
