// Cover images live in the synced store's `covers` table (see store.ts), so they
// reach the server and other devices like all other data. These keep their old
// Promise-based signatures so the components that call them don't have to change.

import {store} from './appStore.ts';
import {COVERS_TABLE} from './store.ts';

export async function saveImage(id: string, dataUrl: string): Promise<void> {
  store.setCell(COVERS_TABLE, id, 'data', dataUrl);
}

export async function loadImage(id: string): Promise<string | null> {
  const data = store.getCell(COVERS_TABLE, id, 'data');
  return typeof data === 'string' && data ? data : null;
}

export async function deleteImage(id: string): Promise<void> {
  store.delRow(COVERS_TABLE, id);
}

// Compress a File to a JPEG data URL. Resizes to maxPx on the longest side.
export function compressImage(file: File, maxPx = 900, quality = 0.80): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

// Fires when a cover is added, changed, or removed — whether by a local save or
// by a change arriving over sync — so ItemCard/ItemForm refresh their preview.
type Listener = (id: string) => void;

export function onImageChange(fn: Listener): () => void {
  const listenerId = store.addRowListener(COVERS_TABLE, null, (_store, _table, rowId) =>
    fn(rowId),
  );
  return () => store.delListener(listenerId);
}
