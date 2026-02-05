# Multisig Wallet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multisig workflows under Wallet to manage multisig groups, transfers, transactions, and balances.

**Architecture:** Introduce a multisig service wrapper around @mixin.dev/mixin-node-sdk safe/utxo multisig APIs, then add Wallet screens wired to these services. UI follows existing MenuList/FormView patterns.

**Tech Stack:** Bun, Ink (React), TypeScript, @mixin.dev/mixin-node-sdk, Vitest.

---

### Task 1: Set up Vitest test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/mixin/services/__tests__/multisig.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";

it("placeholder", () => {
  expect(true).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run`
Expected: FAIL with assertion error.

**Step 3: Write minimal implementation**

- Add devDependency `vitest`.
- Add `"test": "vitest run"` to scripts.
- Add basic `vitest.config.ts` with TS support.
- Replace placeholder test with real tests from Task 3.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run`
Expected: PASS (or fail until Task 3 test is updated).

**Step 5: Commit**

```bash
git add package.json vitest.config.ts src/mixin/services/__tests__/multisig.test.ts
```

---

### Task 2: Define multisig service API (from SDK docs)

**Files:**
- Modify: `src/mixin/services/multisig.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { createMultisigService } from "../multisig.js";

describe("multisig service API", () => {
  it("requires a group id for group detail", () => {
    const service = createMultisigService({} as any);
    expect(() => service.groupDetail("")).toThrow("Group ID is required");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: FAIL with module not found or method not found.

**Step 3: Write minimal implementation**

- Implement `createMultisigService` in `src/mixin/services/multisig.ts` with methods from SDK docs.
- Add input validation for required fields.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/mixin/services/multisig.ts src/mixin/services/__tests__/multisig.test.ts
```

---

### Task 3: Write tests for group list, balances, and transactions

**Files:**
- Modify: `src/mixin/services/__tests__/multisig.test.ts`

**Step 1: Write the failing tests**

```typescript
it("lists multisig groups", async () => {
  const service = createMultisigService(mockClient);
  const groups = await service.listGroups();
  expect(groups.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: FAIL until service methods implemented.

**Step 3: Write minimal implementation**

- Add mock client helpers for required SDK calls.
- Implement listGroups, listBalances, listTransactions in service.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/mixin/services/multisig.ts src/mixin/services/__tests__/multisig.test.ts
```

---

### Task 4: Wire multisig service into app services

**Files:**
- Modify: `src/mixin/services/index.ts`

**Step 1: Write the failing test**

```typescript
import { createServices } from "../index.js";

it("exposes multisig service", () => {
  const services = createServices({} as any, {} as any);
  expect(services.multisig).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: FAIL until multisig is wired.

**Step 3: Write minimal implementation**

- Add `createMultisigService` and export as `multisig` in `createServices`.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/mixin/services/index.ts src/mixin/services/__tests__/multisig.test.ts
```

---

### Task 5: Add Wallet multisig menu and routes

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/types.ts`

**Step 1: Write the failing test**

```typescript
it("routes to wallet-multisig-menu", () => {
  expect(true).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/mixin/services/__tests__/multisig.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add menu entry in Wallet menu.
- Add route handling for multisig screens.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/App.tsx src/ui/types.ts
```

---

### Task 6: Implement multisig screens

**Files:**
- Modify: `src/ui/screens/WalletScreens.tsx`

**Step 1: Write the failing test**

```typescript
it("renders multisig groups list", () => {
  expect(true).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add screens: groups list, group detail, transfer form, transactions list, balances list, overview.
- Use MenuList/FormView/ResultScreen patterns.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/screens/WalletScreens.tsx
```

---

### Task 7: Update commands view

**Files:**
- Modify: `src/ui/layout/CommandsView.tsx`

**Step 1: Write the failing test**

```typescript
it("shows multisig shortcuts", () => {
  expect(true).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add multisig commands under WALLET section.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/layout/CommandsView.tsx
```

---

### Task 8: Build verification

**Files:**
- None

**Step 1: Run build**

Run: `bun run build`
Expected: Exit code 0.

**Step 2: Commit**

```bash
git status
```

---

Plan complete. Two execution options:

1. Subagent-Driven (this session) — I dispatch fresh subagent per task, review between tasks.
2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints.

Which approach?