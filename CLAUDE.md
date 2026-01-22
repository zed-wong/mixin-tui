# Mixin TUI Notes

## Architecture
- Runtime: Bun
- UI: Ink (React-based TUI)
- SDK: @mixin.dev/mixin-node-sdk
- Language: TypeScript

## Structure
- `src/index.tsx`: Ink entry point, renders `App`.
- `src/ui/App.tsx`: TUI router, menus, and domain screens.
- `src/ui/components/*`: Reusable UI pieces (menus, forms, JSON view).
- `src/ui/theme.ts`: Shared color theme.
- `src/mixin/config.ts`: Loads bot config (default `mixin-config.json` or override path).
- `src/mixin/client.ts`: Initializes Mixin SDK client from config.
- `src/mixin/services/*`: Domain service wrappers (wallet, transfer, user, network, safe, messages).

## Config
- Default config path: `./mixin-config.json`
- Override path via env `MIXIN_CONFIG` or in-TUI switch.
- Config keys (from `mixin-config.json.example`): `app_id`, `session_id`, `server_public_key`, `session_private_key`, optional `spend_private_key`, `oauth_client_secret`.
