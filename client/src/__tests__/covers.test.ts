import {describe, it, expect} from 'vitest';
import {saveImage, loadImage, deleteImage, onImageChange} from '../imageStore.ts';

// Covers are stored in the synced store's `covers` table (see store.ts), so the
// same writes that these exercise are what propagate to the server and other
// devices over WebSocket.

describe('cover images via the synced store', () => {
  it('round-trips a cover and clears it on delete', async () => {
    await saveImage('round-trip', 'data:image/jpeg;base64,AAA');
    expect(await loadImage('round-trip')).toBe('data:image/jpeg;base64,AAA');

    await deleteImage('round-trip');
    expect(await loadImage('round-trip')).toBeNull();
  });

  it('notifies listeners when a cover changes (local or synced)', async () => {
    const seen: string[] = [];
    const unsub = onImageChange((id) => seen.push(id));

    await saveImage('notified', 'data:image/jpeg;base64,BBB');
    expect(seen).toContain('notified');

    unsub();
    await saveImage('after-unsub', 'data:image/jpeg;base64,CCC');
    expect(seen).not.toContain('after-unsub');
  });
});
