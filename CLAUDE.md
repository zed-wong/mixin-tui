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
- `src/mixin/configStore.ts`: Stores named bot configs under `~/.mixin-tui/configs`.
- `src/mixin/client.ts`: Initializes Mixin SDK client from config.
- `src/mixin/services/*`: Domain service wrappers (wallet, transfer, user, network, safe, messages, auth).

## Config
- Default config path: `./mixin-config.json`
- Override path via env `MIXIN_CONFIG` or in-TUI switch.
- Saved configs live in `~/.mixin-tui/configs/*.json` and are listed in Manage Bots.
- Manage Bots supports adding bots by pasting keystore JSON and removing saved bots.
- Config keys (from `mixin-config.json.example`): `app_id`, `session_id`, `server_public_key`, `session_private_key`, optional `spend_private_key`, `oauth_client_secret`.

## Mixin Conversation + Message Loop Notes (developers.mixin.one)
- Create conversation (bot token only): `POST /conversations` with `category`, `conversation_id`, `participants`, optional `name` for groups. https://developers.mixin.one/docs/api/conversations/create
- Read conversation metadata (name, participants, code_id/code_url): `GET /conversations/:id`. https://developers.mixin.one/docs/api/conversations/read
- Group management (join via `code_id`, rotate invite, add/remove participants, exit, admin role): https://developers.mixin.one/docs/api/conversations/group
- WebSocket message loop: after connect, send `LIST_PENDING_MESSAGES` first; all messages arrive via the loop. https://developers.mixin.one/docs/app/guide/message-loop
- ACK required: after processing each message, send status `READ` (bulk via `POST /acknowledgements`) or server will re-push. https://developers.mixin.one/docs/api/messages/read
- Bots only support `PLAIN_*` message categories for sending. https://developers.mixin.one/docs/api/messages/category
- Docs do not explicitly list `SYSTEM_CONVERSATION`; when conversation-related events arrive over the loop, fetch `GET /conversations/:id` to refresh name/participants and persist locally.
