# Publishing to npm for `npx` usage

This document describes how to prepare and publish `mixin-tui` so it can be run via `npx mixin-tui`.

## Configuration Recap

The following changes have been made to enable `npx` support:

1.  **Entry Point Hashbang**: `src/index.tsx` starts with `#!/usr/bin/env node`.
2.  **Binary Mapping**: `package.json` includes:
    ```json
    "bin": {
      "mixin-tui": "./dist/index.js"
    }
    ```
3.  **Build Script**: `package.json` includes a build script that bundles all dependencies (except those that must remain external) into a single Node-compatible file:
    ```bash
    bun build ./src/index.tsx --outfile ./dist/index.js --target node --bundle --external react-devtools-core
    ```
4.  **Files Whitelist**: `package.json` includes a `files` array to ensure only the bundle and README are published:
    ```json
    "files": [
      "dist",
      "README.md"
    ]
    ```

## Publishing Workflow

When you are ready to publish, follow these steps:

### 1. Build the project
Ensure the latest bundle is generated:
```bash
bun run build
```

### 2. Test locally
You can test the command as if it were installed globally:
```bash
# In the project root
npm link

# Now you can run it from anywhere
mixin-tui
```
*Note: Use `npm unlink -g mixin-tui` to remove it later.*

### 3. Versioning
Increment the version in `package.json` (e.g., to `0.1.1`):
```bash
npm version patch
```

### 4. Publish to npm
```bash
npm login
npm publish
```

## Running via npx
Once published, users can run the latest version without installation:
```bash
npx mixin-tui
```
