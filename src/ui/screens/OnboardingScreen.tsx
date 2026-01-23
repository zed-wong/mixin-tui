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
  const [mode, setMode] = useState<"welcome" | "add">("welcome");

  useEffect(() => {
    if (mode === "welcome") {
      setCommandHints("A = Add Bot, Q = Quit");
    } else {
      setCommandHints("ENTER = NEXT/SAVE, ESC = BACK");
    }
  }, [mode, setCommandHints]);

  useInput((input) => {
    if (!inputEnabled || mode !== "welcome") return;
    if (input === "a" || input === "A") {
      setMode("add");
    }
    if (input === "q" || input === "Q") {
      onQuit();
    }
  });

  const instructions = [
    { label: "1. Create a Mixin Bot", detail: "Go to https://mixin.one/bot to create your bot" },
    { label: "2. Get Keystore JSON", detail: "Copy your bot's keystore JSON from the dashboard" },
    { label: "3. Paste & Connect", detail: "Paste the JSON below to connect your bot" },
  ];

  if (mode === "add") {
    return (
      <FormView
        title="Add Your First Bot"
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
        helpText="ENTER = SAVE & START, ESC = BACK"
        onSubmit={async (values) => {
          if (!inputEnabled) return;
          setStatus("loading", "Saving bot config...");
          try {
            const entry = await saveStoredConfigFromJson({
              label: values.botId ?? "",
              rawJson: values.keystoreJson ?? "",
            });
            setStatus("idle", "Bot connected successfully");
            onComplete({ path: entry.path, label: entry.label });
          } catch (error) {
            setStatus(
              "error",
              error instanceof Error ? error.message : String(error)
            );
            setMode("welcome");
          }
        }}
        onCancel={() => setMode("welcome")}
        inputEnabled={inputEnabled}
        setCommandHints={setCommandHints}
      />
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={THEME.primary}>
          Welcome to Mixin TUI
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={THEME.muted}>
          To get started, you need to add a Mixin bot configuration.
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold color={THEME.secondary}>
          Quick Start:
        </Text>
      </Box>

      {instructions.map((step) => (
        <Box key={step.label} marginBottom={1} flexDirection="column">
          <Box>
            <Text color={THEME.infoLight}>{step.label}</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color={THEME.muted} dimColor>
              {step.detail}
            </Text>
          </Box>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={THEME.muted} dimColor>
          Press <Text bold>A</Text> to add your bot now, <Text bold>Q</Text> to quit
        </Text>
      </Box>
    </Box>
  );
};
