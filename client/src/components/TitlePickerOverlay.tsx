import {useEffect, useRef, useState} from 'react';
import {useLocale} from '../LocaleContext.tsx';
import {recognizeAllLines} from '../ocr.ts';
import type {OcrLine, OcrProgress} from '../ocr.ts';

interface Props {
  imageUrl: string;
  onChoose: (title: string) => void;
  onCancel: () => void;
}

type RenderBox = {offsetX: number; offsetY: number; width: number; height: number};

export default function TitlePickerOverlay({imageUrl, onChoose, onCancel}: Props) {
  const {strings} = useLocale();
  const [lines, setLines]       = useState<OcrLine[]>([]);
  const [scanning, setScanning] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderBox, setRenderBox] = useState<RenderBox>({offsetX: 0, offsetY: 0, width: 0, height: 0});

  // Run OCR once on mount.
  useEffect(() => {
    let cancelled = false;
    recognizeAllLines(imageUrl, (p: OcrProgress) => {
      if (!cancelled) setProgress(p.progress);
    })
      .then((result) => {
        if (cancelled) return;
        setLines(result);
        setScanning(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('TitlePicker OCR failed', err);
        setError(strings.scanError);
        setScanning(false);
      });
    return () => { cancelled = true; };
  }, [imageUrl, strings.scanError]);

  // Compute letterbox render area whenever lines arrive or container resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || lines.length === 0) return;
    const {imageWidth, imageHeight} = lines[0];
    if (!imageWidth || !imageHeight) return;

    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const imgAspect = imageWidth / imageHeight;
      const boxAspect = cw / ch;
      let rw: number, rh: number, ox: number, oy: number;
      if (imgAspect > boxAspect) {
        // image wider than container → constrained by width, letterbox top/bottom
        rw = cw; rh = cw / imgAspect; ox = 0; oy = (ch - rh) / 2;
      } else {
        // image taller than container → constrained by height, letterbox left/right
        rh = ch; rw = ch * imgAspect; ox = (cw - rw) / 2; oy = 0;
      }
      setRenderBox({offsetX: ox, offsetY: oy, width: rw, height: rh});
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lines]);

  return (
    <div className="title-picker">
      <div className="title-picker-header">
        <button className="title-picker-cancel" type="button" onClick={onCancel}>
          {strings.cancel}
        </button>
        <span className="title-picker-hint">
          {scanning ? strings.scanning : (lines.length > 0 ? strings.scanTapLine : '')}
        </span>
      </div>

      <div className="title-picker-body" ref={containerRef}>
        <img
          className="title-picker-img"
          src={imageUrl}
          alt=""
          draggable={false}
        />

        {scanning && (
          <div className="title-picker-loading">
            <span>{strings.scanning}</span>
            <div className="title-picker-progress">
              <div
                className="title-picker-progress-bar"
                style={{width: `${Math.round(progress * 100)}%`}}
              />
            </div>
          </div>
        )}

        {!scanning && error && (
          <div className="title-picker-error">{error}</div>
        )}

        {!scanning && renderBox.width > 0 && lines.map((line, i) => {
          const {bbox, imageWidth, imageHeight} = line;
          if (!imageWidth || !imageHeight) return null;
          const left   = renderBox.offsetX + (bbox.x0 / imageWidth)  * renderBox.width;
          const top    = renderBox.offsetY + (bbox.y0 / imageHeight) * renderBox.height;
          const width  = ((bbox.x1 - bbox.x0) / imageWidth)  * renderBox.width;
          const height = ((bbox.y1 - bbox.y0) / imageHeight) * renderBox.height;
          return (
            <button
              key={i}
              type="button"
              className="title-picker-region"
              style={{left, top, width, height}}
              onClick={() => onChoose(line.text)}
              aria-label={line.text}
              title={line.text}
            />
          );
        })}
      </div>
    </div>
  );
}
