import {resizeToPng, setPngDpiWithoutResample} from './imageTools';
import {documentToSvg} from './io';
import type {LayerItem, VectorDocument} from './model';

export const imageTypes = 'image/png,image/jpeg,image/webp';
export const validPpi = (ppi: number) => Number.isInteger(ppi) && ppi >= 1 && ppi <= 2400;
export const validSize = (width: number, height: number) =>
  [width, height].every(value => Number.isInteger(value) && value >= 1 && value <= 16384)
  && width * height <= 40_000_000;

export async function decodeImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });
}

export async function openRaster(file: File) {
  if (!imageTypes.split(',').includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  const src = await blobToDataUrl(file);
  const image = await decodeImage(src);
  return {src, width: image.naturalWidth, height: image.naturalHeight};
}

export async function renderLayerPng(layer: LayerItem, image: HTMLImageElement, width: number, height: number, ppi: number, resample: boolean) {
  if (!layer.src || !validPpi(ppi)) throw new Error('Invalid image or resolution.');
  if (resample) {
    if (!validSize(width, height)) throw new Error('Use up to 16,384 px per side and 40 million pixels total.');
    return resizeToPng(image, width, height, ppi);
  }
  const original = await (await fetch(layer.src)).blob();
  return setPngDpiWithoutResample(new File([original], 'image.png', {type: original.type}), ppi);
}

export async function resizeLayer(layer: LayerItem, image: HTMLImageElement, width: number, height: number, ppi: number, resample: boolean) {
  const png = await renderLayerPng(layer, image, width, height, ppi, resample);
  return {src: await blobToDataUrl(png), ppi};
}

export async function exportArtboardPng(doc: VectorDocument, width: number, height: number, ppi: number) {
  if (!validSize(width, height) || !validPpi(ppi)) throw new Error('Invalid output size or resolution.');
  const url = URL.createObjectURL(new Blob([documentToSvg(doc)], {type: 'image/svg+xml'}));
  try {
    return await resizeToPng(await decodeImage(url), width, height, ppi);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readPngPpi(src: string) {
  if (!src.startsWith('data:image/png;')) return undefined;
  const bytes = new DataView(await (await fetch(src)).arrayBuffer());
  for (let offset = 8; offset + 12 <= bytes.byteLength;) {
    const length = bytes.getUint32(offset);
    if (offset + 12 + length > bytes.byteLength) break;
    const type = bytes.getUint32(offset + 4);
    if (type === 0x70485973 && length === 9 && bytes.getUint8(offset + 16) === 1) {
      const x = bytes.getUint32(offset + 8);
      const y = bytes.getUint32(offset + 12);
      const ppi = Math.round(x * 0.0254);
      return x === y && validPpi(ppi) ? ppi : undefined;
    }
    if (type === 0x49444154) break;
    offset += length + 12;
  }
}
