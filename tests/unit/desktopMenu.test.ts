import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("macOS menu bar", () => {
  it("only points at editor commands that exist", () => {
    const menu = read("src-tauri/src/menu.rs");
    const menuIds = [...menu.matchAll(/item\(app, "([a-z0-9-]+)"/g)].map((match) => match[1]);
    const commandSource = read("app/editor/hooks/useEditorState.tsx") + read("app/editor/shell/useShellCommands.ts");
    const commandIds = new Set([...commandSource.matchAll(/id: "([a-z0-9-]+)"/g)].map((match) => match[1]));
    expect(menuIds.length).toBeGreaterThan(20);
    expect(menuIds.filter((id) => !commandIds.has(id))).toEqual([]);
  });
});
