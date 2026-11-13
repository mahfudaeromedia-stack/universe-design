import {useEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import type {LayerItem, VectorDocument} from './model';
import {download} from './io';
import {decodeImage, exportArtboardPng, readPngPpi, renderLayerPng, resizeLayer, validPpi, validSize} from './raster';

export type ImageAction = 'image' | 'canvas' | 'export' | 'layer-export';
type Props = {
  action: ImageAction;
  doc: VectorDocument;
  layer?: LayerItem;
  onClose: () => void;
  onCanvasSize: (width: number, height: number) => void;
  onImageSize: (id: string, patch: Partial<LayerItem>) => void;
};

export default function ImageDialog({action, doc, layer, onClose, onCanvasSize, onImageSize}: Props) {
  const isLayerExport = action === 'layer-export';
  const isImage = action === 'image' || isLayerExport;
  const isCanvas = action === 'canvas';
  const isPng = !!layer?.src?.startsWith('data:image/png;');
  const [source, setSource] = useState<HTMLImageElement>();
  const [original, setOriginal] = useState({width:doc.artboard.width,height:doc.artboard.height});
  const [width, setWidth] = useState(String(doc.artboard.width));
  const [height, setHeight] = useState(String(doc.artboard.height));
  const [ppi, setPpi] = useState(String(isImage ? layer?.ppi ?? 96 : 96));
  const [linked, setLinked] = useState(!isCanvas);
  const [resample, setResample] = useState(!isPng);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = modal.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    if (!isImage || !layer?.src) return;
    let active = true;
    Promise.all([decodeImage(layer.src), readPngPpi(layer.src)]).then(([image, embeddedPpi]) => {
      if (!active) return;
      const {naturalWidth, naturalHeight} = image;
      setSource(image);
      setPpi(String(layer.ppi ?? embeddedPpi ?? 96));
      setOriginal({width: naturalWidth, height: naturalHeight});
      setWidth(String(naturalWidth));
      setHeight(String(naturalHeight));
    }).catch(() => { if (active) setError('Could not read this image layer.'); });
    return () => { active = false; };
  }, [isImage, layer?.src, layer?.ppi]);

  const title = isLayerExport ? 'Export Layer PNG' : isImage ? 'Image Size' : isCanvas ? 'Canvas Size' : 'Export PNG';
  const dimensionsEditable = !isImage || resample;
  const outputWidth = dimensionsEditable ? Number(width) : original.width;
  const outputHeight = dimensionsEditable ? Number(height) : original.height;
  const valid = (!isImage || !!source) && (!dimensionsEditable || validSize(outputWidth, outputHeight))
    && (isCanvas || validPpi(Number(ppi)));
  const setDimension = (axis: 'width' | 'height', value: string) => {
    const setValue = axis === 'width' ? setWidth : setHeight;
    const setOther = axis === 'width' ? setHeight : setWidth;
    const ratio = axis === 'width' ? original.height / original.width : original.width / original.height;
    setValue(value);
    if (linked && Number(value) > 0) setOther(String(Math.max(1, Math.round(Number(value) * ratio))));
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      if (isCanvas) onCanvasSize(outputWidth, outputHeight);
      else if (isImage && layer && source) {
        if (isLayerExport) {
          const png = await renderLayerPng(layer, source, outputWidth, outputHeight, Number(ppi), resample);
          download(png, layer.name.replace(/\.[^.]+$/, '') + '.png');
        } else onImageSize(layer.id, await resizeLayer(layer, source, outputWidth, outputHeight, Number(ppi), resample));
      } else {
        download(await exportArtboardPng(doc, outputWidth, outputHeight, Number(ppi)), `${doc.name}.png`);
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply these settings.');
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={modal} className="image-dialog" aria-labelledby="image-dialog-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <h2 id="image-dialog-title">{title}</h2>
      <p>{isImage ? layer?.name : doc.artboard.name}</p>
      <p>{isLayerExport ? 'Download the source image of this layer as a PNG.' : isImage ? 'Change the source pixels of this layer. Its placement and size on the artboard stay the same.'
        : isCanvas ? 'Change the artboard boundary from the top left. Layer positions and sizes stay the same.'
          : 'Export all visible layers inside the artboard. Output dimensions apply to this PNG.'}</p>
      {isImage && source && <img className="image-dialog-preview" src={layer?.src} alt="Selected layer preview"/>}
      {(!isImage || source) && <>
        {isImage && isPng && <label className="check">
          <input type="checkbox" checked={resample} disabled={busy} onChange={event => setResample(event.target.checked)}/>
          Resample image pixels
        </label>}
        {isImage && isPng && !resample && <p>Only the PNG resolution metadata will change.</p>}
        {isImage && !isPng && <p>{isLayerExport ? 'Output format is PNG.' : 'Applying converts the image layer to PNG.'}</p>}
        <div className="fields">
          <label>Width (px)<input type="number" min="1" step="1" value={dimensionsEditable ? width : original.width}
            disabled={!dimensionsEditable || busy} onChange={event => setDimension('width', event.target.value)}/></label>
          <label>Height (px)<input type="number" min="1" step="1" value={dimensionsEditable ? height : original.height}
            disabled={!dimensionsEditable || busy} onChange={event => setDimension('height', event.target.value)}/></label>
        </div>
        <label className="check"><input type="checkbox" checked={linked} disabled={!dimensionsEditable || busy}
          onChange={event => setLinked(event.target.checked)}/> Lock aspect ratio</label>
        {!isCanvas && <>
          <label className="wide">Resolution (PPI)<input type="number" min="1" max="2400" step="1" value={ppi}
            disabled={busy} onChange={event => setPpi(event.target.value)}/></label>
          <div className="density-presets">{[72, 96, 150, 300, 600].map(value =>
            <button type="button" key={value} disabled={busy} aria-pressed={Number(ppi) === value}
              className={Number(ppi) === value ? 'active' : ''} onClick={() => setPpi(String(value))}>{value}</button>)}</div>
          {valid && <p>Print size {(outputWidth / Number(ppi) * 2.54).toFixed(2)} × {(outputHeight / Number(ppi) * 2.54).toFixed(2)} cm</p>}
        </>}
      </>}
      {!valid && (!isImage || source) && !error && <p role="status">Use up to 16,384 px per side, 40 million pixels total, and 1–2400 PPI where applicable.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="image-dialog-actions">
        <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="primary" disabled={busy || !valid}>{busy ? 'Processing…' : (action === 'export' || isLayerExport) ? 'Download PNG' : 'Apply'}</button>
      </div>
    </form>
  </dialog>;
}
