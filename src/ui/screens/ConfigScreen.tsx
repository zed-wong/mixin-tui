import React from "react";
import { Text } from "ink";
import { FormView } from "../components/FormView.js";
import { THEME } from "../theme.js";

export const ConfigSwitchScreen: React.FC<{
  onSubmit: (path: string) => void;
  onCancel: () => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ onSubmit, onCancel, inputEnabled, setCommandHints }) => {
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
      setCommandHints={setCommandHints}
    />
  );
};
