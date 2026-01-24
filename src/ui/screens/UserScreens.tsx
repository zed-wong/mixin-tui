import React, { useEffect, useMemo, useState } from "react";
import { Text, useInput, useStdout } from "ink";
import { FormattedView } from "../components/JsonView.js";
import { FormView } from "../components/FormView.js";
import { THEME } from "../theme.js";
import type { MixinServices } from "../../mixin/services/index.js";
import type { Nav, StatusState } from "../types.js";

const formatProfileLines = (data: unknown): string[] => {
  if (!data || typeof data !== "object") return [];

  const formatValue = (value: unknown, prefix: string = ""): string[] => {
    if (value === null || value === undefined) return [`${prefix}-`];
    if (typeof value === "string") return [`${prefix}${value}`];
    if (typeof value === "number" || typeof value === "boolean") {
      return [`${prefix}${String(value)}`];
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return [`${prefix}[]`];
      const lines: string[] = [`${prefix}[`];
      value.forEach((item, index) => {
        const itemLines = formatValue(item, "  ");
        lines.push(...itemLines.map((line) => (index === value.length - 1 ? `${line}` : line)));
        if (index < value.length - 1) lines[lines.length - 1] += ",";
      });
      lines.push(`${prefix}]`);
      return lines;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return [`${prefix}{}`];
      const lines: string[] = [`${prefix}{`];
      entries.forEach(([k, v], index) => {
        const valueLines = formatValue(v, `  ${k}: `);
        lines.push(...valueLines);
        if (index < entries.length - 1) lines[lines.length - 1] += ",";
      });
      lines.push(`${prefix}}`);
      return lines;
    }
    return [`${prefix}${String(value)}`];
  };

  const lines: string[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const valueLines = formatValue(value, `${key}: `);
    lines.push(...valueLines);
  }
  return lines;
};

export const UserProfileScreen: React.FC<{
  services: MixinServices | null;
  nav: Nav;
  setStatus: (state: StatusState, message: string) => void;
  inputEnabled: boolean;
  setCommandHints: (hints: string) => void;
}> = ({ services, nav, setStatus, inputEnabled, setCommandHints }) => {
  const { stdout } = useStdout();
  const [data, setData] = useState<unknown | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate max lines based on terminal height
  const maxLines = useMemo(() => {
    const rows = stdout?.rows ?? 24;
    // Reserve space for: title (3), header (2), status bar (2), margins (~4)
    return Math.max(10, rows - 12);
  }, [stdout?.rows]);

  const allLines = useMemo(() => {
    if (!data || typeof data !== "object") return [];
    return formatProfileLines(data);
  }, [data]);

  const needsScroll = allLines.length > maxLines;

  useEffect(() => {
    const hints = needsScroll
      ? "▲ / ▼ -> Scroll, ESC -> Exit"
      : "ESC -> Exit";
    setCommandHints(hints);
  }, [setCommandHints, needsScroll]);

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

  useInput((_input, key) => {
    if (!inputEnabled) return;
    if (key.escape || key.return) {
      nav.pop();
      return;
    }
    if (!needsScroll) return;

    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollOffset((prev) => Math.min(allLines.length - maxLines, prev + 1));
    }
  });

  if (!services) {
    return <Text color={THEME.muted}>Load a config to fetch profile.</Text>;
  }
  if (!data) {
    return <Text color={THEME.muted}>Loading profile...</Text>;
  }

  const visibleLines = needsScroll
    ? allLines.slice(scrollOffset, scrollOffset + maxLines)
    : allLines;

  return (
    <FormattedView
      title="My Profile"
      lines={visibleLines}
      totalLines={allLines.length}
      scrollOffset={scrollOffset}
      showScrollIndicator={needsScroll}
    />
  );
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
