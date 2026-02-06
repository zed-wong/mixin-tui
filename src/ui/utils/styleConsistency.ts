import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const NAMED_COLORS = new Set([
  "black",
  "blue",
  "cyan",
  "gray",
  "green",
  "grey",
  "magenta",
  "orange",
  "pink",
  "purple",
  "red",
  "white",
  "yellow",
]);

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_LITERAL_RE =
  /(?:\bcolor\b\s*:\s*|\bbackgroundColor\b\s*:\s*|\bcolor\s*=\s*)(["'])([^"']+)\1/g;

export type UiColorIssue = {
  file: string;
  color: string;
};

const UI_ROOT = new URL("..", import.meta.url).pathname;

function isColorLiteral(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return HEX_COLOR_RE.test(normalized) || NAMED_COLORS.has(normalized);
}

async function listUiTsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "__tests__") {
          return [];
        }
        return listUiTsxFiles(fullPath);
      }

      if (!entry.isFile()) {
        return [];
      }

      if (!entry.name.endsWith(".tsx") || entry.name === "theme.ts") {
        return [];
      }

      return [fullPath];
    })
  );

  return files.flat();
}

export async function findHardcodedUiColors(): Promise<UiColorIssue[]> {
  const files = await listUiTsxFiles(UI_ROOT);
  const issues: UiColorIssue[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    COLOR_LITERAL_RE.lastIndex = 0;

    for (const match of content.matchAll(COLOR_LITERAL_RE)) {
      const color = match[2];
      if (isColorLiteral(color)) {
        issues.push({ file, color });
      }
    }
  }

  return issues;
}
