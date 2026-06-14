const GEMINI_REST = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
}

export function saveApiKey(key) {
  localStorage.setItem('gemini_api_key', key.trim());
}

export function clearApiKey() {
  localStorage.removeItem('gemini_api_key');
}

async function callGemini(parts) {
  const key = getApiKey();
  if (!key) throw new Error('API key not configured');

  const body = JSON.stringify({ contents: [{ parts }] });

  // Try as API key (AIzaSy... format) first
  let res = await fetch(`${GEMINI_REST}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  // If rejected as API key, retry as OAuth2 Bearer token (AQ..., ya29... formats)
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const firstBody = await res.json().catch(() => ({}));
    const isKeyError = firstBody.error?.status === 'INVALID_ARGUMENT'
      || firstBody.error?.status === 'UNAUTHENTICATED'
      || firstBody.error?.status === 'PERMISSION_DENIED';

    if (isKeyError) {
      res = await fetch(GEMINI_REST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body,
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim().replace(/```json\n?|\n?```/g, '').trim();
}

const ANALYSIS_PROMPT = `Analyze this photo and return ONLY valid JSON with this exact structure:
{
  "scene": "brief scene description in Portuguese",
  "mood": "one of: alegre|nostálgico|íntimo|aventureiro|festivo|tranquilo|emotivo",
  "people_count": <number 0-10>,
  "event_type": "one of: viagem|aniversário|família|natureza|amigos|trabalho|romance|esporte|outro",
  "music_energy": <float 0.0-1.0>,
  "music_valence": <float 0.0-1.0>,
  "comedy_potential": <float 0.0-1.0>,
  "comedy_suggestion": {
    "character_0": "sarcastic or ironic speech bubble in Portuguese, max 12 words — funny and acidic",
    "character_1": "sarcastic comeback in Portuguese, max 12 words (only if people_count >= 2, else empty string)",
    "emoji_overlay": ["emoji1", "emoji2", "emoji3"]
  },
  "location_hint": "inferred location or environment in Portuguese",
  "dominant_colors": ["color1", "color2"]
}

Rules:
- comedy_suggestion must always be sarcastic, self-aware or absurdist — think Brazilian stand-up humor
- character_0 is ALWAYS required — for landscapes/objects joke about the scene, not a person
- music_energy: high for action/party/sport, low for intimate/calm/nature
- music_valence: high for happy/funny, low for nostalgic/emotional
- Respond ONLY with JSON, no markdown, no explanation`;

export async function analyzePhoto(imageBase64, filename, exif = {}) {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

  const contextHint = exif?.GPSLatitude
    ? `\nEXIF: coordinates ${exif.GPSLatitude}, ${exif.GPSLongitude}`
    : exif?.DateTimeOriginal
    ? `\nEXIF: taken on ${exif.DateTimeOriginal}`
    : '';

  const text = await callGemini([
    { text: ANALYSIS_PROMPT + contextHint },
    { inlineData: { mimeType, data: base64Data } },
  ]);

  return JSON.parse(text);
}

function buildDialoguePrompt({ people_count = 0, scene, mood }) {
  const peopleLine =
    people_count >= 1
      ? `Há ${people_count} pessoa(s). Crie ${Math.min(people_count, 3)} balões de fala, um por pessoa.`
      : 'Sem pessoas visíveis — deixe "dialogues" vazio, foque no "caption" sarcástico sobre a cena.';

  return `Você é um comediante brasileiro de stand-up analisando esta foto.
Cena: ${scene || 'desconhecida'}. Clima: ${mood || 'neutro'}.

${peopleLine}

Estilo: SARCÁSTICO, ÁCIDO, debochado, irônico. Humor brasileiro tipo amigo zueiro. NUNCA ofensivo a pessoas — zoa a situação, pose ou cenário.

Retorne APENAS JSON:
{
  "dialogues": [{ "person": 0, "text": "PT-BR máx 10 palavras", "position": "top-left|top-right|bottom-left|bottom-right" }],
  "floating_emojis": ["emoji1","emoji2","emoji3","emoji4"],
  "caption": "legenda ácida PT-BR máx 15 palavras"
}

Sempre retorne "caption". Somente JSON, sem markdown.`;
}

export async function generateDialogue(imageBase64, { people_count, scene, mood }) {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

  const text = await callGemini([
    { text: buildDialoguePrompt({ people_count, scene, mood }) },
    { inlineData: { mimeType, data: base64Data } },
  ]);

  const dialogue = JSON.parse(text);
  if (!Array.isArray(dialogue.dialogues)) dialogue.dialogues = [];
  if (!Array.isArray(dialogue.floating_emojis)) dialogue.floating_emojis = [];
  return dialogue;
}

export async function analyzePhotoBatch(photos, onProgress) {
  const CONCURRENCY = 3;
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
