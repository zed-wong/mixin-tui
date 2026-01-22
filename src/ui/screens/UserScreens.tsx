import React, { useEffect, useState } from "react";
import { Text, useInput } from "ink";
import { FormattedView } from "../components/JsonView.js";
import { FormView } from "../components/FormView.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, StatusState } from "../types.js";

export const UserProfileScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  const [data, setData] = useState<unknown | null>(null);

  useEffect(() => {
    setCommandHints("ESC/ENTER = EXIT");
  }, [setCommandHints]);

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

export const UserFetchScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch users.</Text>;
  }

  return (
    <FormView
      title="Fetch User"
      fields={[{ key: "userId", label: "User/Mixin ID", placeholder: "UUID or Mixin ID" }]}
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
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
