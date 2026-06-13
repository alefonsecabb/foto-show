const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, people_count, scene, mood } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const prompt = `You are a comedian analyzing this photo.
Scene: ${scene || 'unknown'}. Mood: ${mood || 'neutral'}. People visible: ${people_count || 0}.

Generate funny, lighthearted speech bubbles for the people in this photo. Return ONLY valid JSON:
{
  "dialogues": [
    { "person": 0, "text": "funny text in Portuguese, max 10 words", "position": "top-left|top-right|bottom-left|bottom-right" },
    { "person": 1, "text": "funny reply in Portuguese, max 10 words", "position": "top-right" }
  ],
  "floating_emojis": ["emoji1", "emoji2", "emoji3", "emoji4"],
  "caption": "funny overall caption in Portuguese, max 15 words"
}

Rules:
- Max ${Math.min(people_count || 1, 3)} dialogue entries
- Keep it wholesome and fun, no offensive content
- Emojis should match the scene/mood
- Portuguese only
- Return ONLY JSON`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64Data } }
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const dialogue = JSON.parse(cleaned);

    return res.status(200).json({ success: true, dialogue });
  } catch (err) {
    console.error('Dialogue error:', err.message);
    return res.status(500).json({ error: 'Dialogue generation failed', details: err.message });
  }
};
