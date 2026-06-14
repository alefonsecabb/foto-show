const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://foto-show.vercel.app';

export async function analyzePhoto(imageBase64, filename, exif = {}) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, filename, exif }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.analysis;
}

export async function generateDialogue(imageBase64, { people_count, scene, mood }) {
  const res = await fetch(`${API_BASE}/api/dialogue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, people_count, scene, mood }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.dialogue;
}

export async function analyzePhotoBatch(photos, onProgress) {
  const CONCURRENCY = 5;
  const results = {};

  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const batch = photos.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ imageBase64, filename, exif }) => {
        try {
          results[filename] = await analyzePhoto(imageBase64, filename, exif);
        } catch (e) {
          console.warn(`Failed to analyze ${filename}:`, e.message);
          results[filename] = null;
        }
        onProgress?.(Object.keys(results).length, photos.length);
      })
    );
  }

  return results;
}
