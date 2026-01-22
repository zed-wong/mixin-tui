# Mixin TUI Notes

## Architecture
- Runtime: Bun
- UI: Ink (React-based TUI)
- SDK: @mixin.dev/mixin-node-sdk
- Language: TypeScript

## Structure
- `src/index.tsx`: Ink entry point, renders `App`.
- `src/ui/App.tsx`: TUI router and layout shell.
- `src/ui/screens/*`: Domain screens (home, wallet, user, network, messages, auth, config).
- `src/ui/layout/*`: Shared layout components (status bar, commands).
- `src/ui/components/*`: Reusable UI pieces (menus, forms, JSON view).
- `src/ui/types.ts`: Shared route/nav/status types.
- `src/ui/utils/clipboard.ts`: Best-effort clipboard copy helper for tokens.
- `src/ui/utils/transactions.ts`: Transaction summary helpers.
- `src/ui/theme.ts`: Shared color theme.
- `src/mixin/config.ts`: Loads bot config (default `mixin-config.json` or override path).
- `src/mixin/client.ts`: Initializes Mixin SDK client from config.
- `src/mixin/services/*`: Domain service wrappers (wallet, transfer, user, network, safe, messages, auth).

## Config
- Default config path: `./mixin-config.json`
- Override path via env `MIXIN_CONFIG` or in-TUI switch.
- Config keys (from `mixin-config.json.example`): `app_id`, `session_id`, `server_public_key`, `session_private_key`, optional `spend_private_key`, `oauth_client_secret`.
