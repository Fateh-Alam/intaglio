// One place for the things the web and the macOS app do differently: saving
// files and showing system dialogs. The desktop side lives in src-tauri/src/lib.rs.

import type { InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";

/** True inside the Tauri desktop app, false in a browser. */
export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// Loaded on demand so the web bundle never pulls in the Tauri bridge.
async function invokeDesktop<T>(command: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args, options);
}

/**
 * Saves a file the user asked for. The browser downloads it; the desktop app
 * shows the native Save sheet with `filename` suggested. Resolves `false` if
 * the user cancels the sheet.
 */
export async function saveFile(blob: Blob, filename: string): Promise<boolean> {
  if (isDesktopApp()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return invokeDesktop<boolean>("save_file", bytes, { headers: { "x-etch-filename": encodeURIComponent(filename) } });
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}

/** Ask for a destination folder on Mac and return the filename actually saved. */
export async function saveVideoFile(blob: Blob, filename: string): Promise<string | null> {
  if (isDesktopApp()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return invokeDesktop<string | null>("save_video", bytes, { headers: { "x-etch-filename": encodeURIComponent(filename) } });
  }
  return await saveFile(blob, filename) ? filename : null;
}

/** Tells the user something went wrong. A native alert sheet on desktop. */
export async function showError(message: string, title = "Etch"): Promise<void> {
  if (isDesktopApp()) {
    await invokeDesktop<void>("show_message", { title, message, kind: "error" });
    return;
  }
  window.alert(message);
}

/** Asks the user to confirm an action. A native sheet on desktop. */
export async function askConfirm(message: string, options: { title?: string; confirmLabel?: string } = {}): Promise<boolean> {
  if (isDesktopApp()) {
    return invokeDesktop<boolean>("ask_confirm", { title: options.title ?? "Etch", message, confirmLabel: options.confirmLabel ?? "OK" });
  }
  return window.confirm(message);
}

/** Desktop only: calls `handler` with the command id of each native menu item chosen. */
export async function onDesktopMenu(handler: (commandId: string) => void): Promise<() => void> {
  if (!isDesktopApp()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<string>("etch:menu", (event) => handler(event.payload));
}

const MIME_BY_EXTENSION: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function takeOpenedFiles(): Promise<File[]> {
  const opened = await invokeDesktop<{ path: string; name: string }[]>("take_opened_files");
  return Promise.all(opened.map(async ({ path, name }) => {
    const bytes = await invokeDesktop<ArrayBuffer>("read_opened_file", { path });
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    return new File([bytes], name, { type: MIME_BY_EXTENSION[extension] ?? "" });
  }));
}

/**
 * Desktop only: calls `handler` with files macOS opened with Etch (Finder
 * double-click, Open With, Dock drop), including any that arrived before the
 * editor loaded.
 */
export async function onDesktopOpenFiles(handler: (files: File[]) => void): Promise<() => void> {
  if (!isDesktopApp()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const deliver = () => takeOpenedFiles()
    .then((files) => { if (files.length > 0) handler(files); })
    .catch((error) => void showError(error instanceof Error ? error.message : "Could not open that file."));
  const unlisten = await listen("etch:open-files", deliver);
  await deliver();
  return unlisten;
}

/**
 * Desktop only: shows the native Open panel for one kind of file. The chosen
 * file arrives through `onDesktopOpenFiles`, like a Finder double-click, so it
 * also lands in File → Open Recent. Resolves `false` if the user cancels.
 */
export async function pickDesktopFile(kind: "photo" | "project" | "look"): Promise<boolean> {
  return invokeDesktop<boolean>("pick_file", { kind });
}
