import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const listeners = new Map<string, (event: { payload: unknown }) => void>();
const listen = vi.fn(async (name: string, callback: (event: { payload: unknown }) => void) => {
  listeners.set(name, callback);
  return () => listeners.delete(name);
});
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

const { askConfirm, isDesktopApp, onDesktopMenu, onDesktopOpenFiles, saveFile, showError } = await import("../../app/lib/platform");

describe("platform bridge in the desktop app", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("detects the desktop app", () => expect(isDesktopApp()).toBe(true));

  it("sends file bytes with an encoded suggested name, and reports a cancel", async () => {
    invoke.mockResolvedValueOnce(false);
    const saved = await saveFile(new Blob([new Uint8Array([1, 2, 3])]), "Café look.etchlook");
    expect(saved).toBe(false);
    const [command, body, options] = invoke.mock.calls[0];
    expect(command).toBe("save_file");
    expect(Array.from(body as Uint8Array)).toEqual([1, 2, 3]);
    expect(options).toEqual({ headers: { "x-etch-filename": "Caf%C3%A9%20look.etchlook" } });
  });

  it("shows errors and confirmations as native dialogs", async () => {
    invoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce(true);
    await showError("Export failed.");
    expect(await askConfirm("Reload now?", { confirmLabel: "Reload" })).toBe(true);
    expect(invoke.mock.calls).toEqual([
      ["show_message", { title: "Etch", message: "Export failed.", kind: "error" }, undefined],
      ["ask_confirm", { title: "Etch", message: "Reload now?", confirmLabel: "Reload" }, undefined],
    ]);
  });
});

describe("desktop menu and Finder files", () => {
  beforeEach(() => {
    invoke.mockReset();
    listeners.clear();
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("passes menu command ids to the editor", async () => {
    const chosen: string[] = [];
    const stop = await onDesktopMenu((id) => chosen.push(id));
    listeners.get("etch:menu")?.({ payload: "export-image" });
    expect(chosen).toEqual(["export-image"]);
    stop();
    expect(listeners.has("etch:menu")).toBe(false);
  });

  it("delivers files queued before the editor loaded, with their image type", async () => {
    invoke.mockImplementation(async (command: string) => {
      if (command === "take_opened_files") return [{ path: "/Photos/IMG_1.JPG", name: "IMG_1.JPG" }];
      if (command === "read_opened_file") return new Uint8Array([7, 8]).buffer;
    });
    const received: File[] = [];
    await onDesktopOpenFiles((files) => received.push(...files));
    expect(invoke).toHaveBeenCalledWith("read_opened_file", { path: "/Photos/IMG_1.JPG" }, undefined);
    expect(received.map((file) => [file.name, file.type, file.size])).toEqual([["IMG_1.JPG", "image/jpeg", 2]]);
  });
});

describe("platform bridge on the web", () => {
  it("is not the desktop app when no Tauri bridge exists", () => expect(isDesktopApp()).toBe(false));
});
