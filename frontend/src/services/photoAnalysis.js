import Exifr from 'exifr';

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.82;

export async function readPhotoFiles(directoryHandle) {
  const files = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file' && /\.(jpe?g|png|webp|heic)$/i.test(entry.name)) {
      const file = await entry.getFile();
      files.push(file);
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function resizeAndEncode(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let w = width;
  let h = height;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(blob);
  });
}

export async function extractExif(file) {
  try {
    const data = await Exifr.parse(file, {
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model'],
    });
    return data || {};
  } catch {
    return {};
  }
}

export function createObjectURL(file) {
  return URL.createObjectURL(file);
}
