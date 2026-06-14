const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    "character_1": "sarcastic comeback or reaction in Portuguese, max 12 words (only if people_count >= 2)",
    "emoji_overlay": ["emoji1", "emoji2", "emoji3"]
  },
  "location_hint": "inferred location or environment in Portuguese",
  "dominant_colors": ["color1", "color2"]
}

Rules:
- comedy_potential > 0.7 only for photos with expressive faces, funny situations, or group interactions
- comedy_suggestion must always be sarcastic, self-aware or absurdist — think Brazilian stand-up humor
- music_energy: high for action/party/sport, low for intimate/calm/nature
- music_valence: high for happy/funny, low for nostalgic/emotional
- Respond ONLY with JSON, no markdown, no explanation`;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, filename, exif } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const contextHint = exif?.GPSLatitude
      ? `\nEXIF hint: photo taken at GPS coordinates ${exif.GPSLatitude}, ${exif.GPSLongitude}`
      : exif?.DateTimeOriginal
      ? `\nEXIF hint: photo taken on ${exif.DateTimeOriginal}`
      : '';

    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT + contextHint },
      { inlineData: { mimeType, data: base64Data } }
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleaned);

    return res.status(200).json({ success: true, filename, analysis });
  } catch (err) {
    console.error('Analyze error:', err.message);
    return res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
};
