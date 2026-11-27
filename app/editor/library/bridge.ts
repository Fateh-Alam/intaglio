import { invoke } from "@tauri-apps/api/core";

export interface LibraryFolder {
  id: number;
  path: string;
  name: string;
  count: number;
}

export interface LibraryPhoto {
  id: number;
  folderId: number;
  name: string;
  raw: boolean;
  available: boolean;
  revision: string;
  rating: number;
  flag: -1 | 0 | 1;
}

export interface LibraryCatalog {
  folders: LibraryFolder[];
  photos: LibraryPhoto[];
}

export const loadCatalog = () => invoke<LibraryCatalog>("library_catalog");
export const importFolder = () => invoke<[number, LibraryCatalog] | null>("library_import");
export const markPhoto = (id: number, edit: Partial<Pick<LibraryPhoto, "rating" | "flag">>) =>
  invoke<void>("library_mark", { id, rating: edit.rating ?? null, flag: edit.flag ?? null });

export async function originalFile(photo: LibraryPhoto) {
  const bytes = await invoke<ArrayBuffer>("library_read", { id: photo.id });
  const suffix = photo.name.split(".").pop()?.toLowerCase();
  const format = suffix === "jpg" || suffix === "jpeg" ? "jpeg" : suffix;
  return new File([bytes], photo.name, { type: photo.raw ? "application/octet-stream" : `image/${format}` });
}

type PreviewJob = () => Promise<void>;
const queue: PreviewJob[] = [];
let reading = 0;
function pump() {
  while (reading < 4 && queue.length) {
    const job = queue.shift()!;
    reading += 1;
    void job().finally(() => { reading -= 1; pump(); });
  }
}

export function readPreview(id: number, large: boolean, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const load = async () => {
      try {
        signal.throwIfAborted();
        const bytes = await invoke<ArrayBuffer>("library_preview", { id, large });
        signal.throwIfAborted();
        resolve(new Blob([bytes], { type: "image/jpeg" }));
      } catch (error) { reject(error); }
    };
    if (large) queue.unshift(load);
    else queue.push(load);
    pump();
  });
}

export const beginExport = () => invoke<number | null>("library_export_begin");
export function saveExport(id: number, name: string, bytes: ArrayBuffer) {
  return invoke<string>("library_export_write", bytes, {
    headers: { "x-etch-export": String(id), "x-etch-filename": encodeURIComponent(name) },
  });
}
export const endExport = (id: number) => invoke<void>("library_export_end", { id });
