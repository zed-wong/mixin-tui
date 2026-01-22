import React from "react";
import { Text } from "ink";
import { FormView } from "../components/FormView.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, StatusState } from "../types.js";

export const AuthTokenScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  if (!services) {
    return <Text color={THEME.muted}>Load a config to sign auth tokens.</Text>;
  }

  return (
    <FormView
      title="Sign Auth Token"
      fields={[
        { key: "method", label: "Method", placeholder: "GET", initialValue: "GET" },
        { key: "uri", label: "URI", placeholder: "/me", initialValue: "/me" },
        { key: "body", label: "Body", placeholder: "Optional JSON string" },
        { key: "exp", label: "Expires", placeholder: "1h", initialValue: "1h" },
      ]}
      helpText="Exp: seconds or 10m/1h/10d"
      onCancel={() => nav.pop()}
      inputEnabled={inputEnabled}
      setCommandHints={setCommandHints}
      onSubmit={(values) => {
        if (!inputEnabled) return;
        setStatus("loading", "Signing auth token...");
        services.auth
          .signAuthToken({
            method: values.method,
            uri: values.uri ?? "",
            body: values.body,
            exp: values.exp,
          })
          .then((result) => {
            nav.push({
              id: "result",
              title: "Auth Token",
              data: result,
              copyText: result.token,
            });
            setStatus("idle", "Ready");
          })
          .catch((error) => {
            setStatus("error", error instanceof Error ? error.message : String(error));
          });
      }}
    />
  );
};
