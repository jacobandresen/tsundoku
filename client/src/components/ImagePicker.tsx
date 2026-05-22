import {useEffect, useRef, useState} from 'react';
import {compressImage, deleteImage, loadImage, saveImage} from '../imageStore.ts';

interface Props {
  itemId: string;
}

export default function ImagePicker({itemId}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadImage(itemId).then((url) => { if (active) setDataUrl(url); }).catch(() => {});
    return () => { active = false; };
  }, [itemId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      await saveImage(itemId, compressed);
      setDataUrl(compressed);
    } catch (err) {
      console.error('Image save failed', err);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    await deleteImage(itemId).catch(() => {});
    setDataUrl(null);
  };

  return (
    <div className="image-picker">
      {dataUrl ? (
        <div className="image-picker-preview">
          <img src={dataUrl} alt="Item photo" className="image-picker-img" />
          <button
            type="button"
            className="image-picker-remove"
            onClick={handleRemove}
            aria-label="Remove photo"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className={`image-picker-btn ${busy ? 'image-picker-btn--busy' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="image-picker-input"
            onChange={handleFile}
            disabled={busy}
          />
          {busy ? '…' : '📷 Take photo'}
        </label>
      )}
    </div>
  );
}
