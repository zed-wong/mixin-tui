import { expect, test } from "bun:test";
import { findHardcodedUiColors } from "./utils/styleConsistency.js";

test("ui components do not use hardcoded color literals", async () => {
  const issues = await findHardcodedUiColors();
  expect(issues).toEqual([]);
});
