const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function buildPrompt({ people_count = 0, scene, mood }) {
  const peopleLine =
    people_count >= 1
      ? `Há ${people_count} pessoa(s) visível(is). Crie no máximo ${Math.min(people_count, 3)} balões de fala, um por pessoa.`
      : 'Não há pessoas visíveis. NÃO gere "dialogues" — deixe o array vazio. Foque no "caption" sarcástico sobre a cena.';

  return `Você é um comediante brasileiro de stand-up analisando esta foto.
Cena: ${scene || 'desconhecida'}. Clima: ${mood || 'neutro'}.

${peopleLine}

Estilo: SARCÁSTICO, ÁCIDO, levemente debochado, irônico. Tipo um amigo zueiro comentando o álbum de fotos. Humor brasileiro, observacional, com timing de stand-up. Pode ser autoirônico, hiperbólico ou absurdo. NUNCA ofensivo a pessoas reais — zoa a SITUAÇÃO, o cenário, a pose, o momento, nunca características físicas, raça, gênero ou orientação.

Retorne APENAS JSON válido nesta estrutura exata:
{
  "dialogues": [
    { "person": 0, "text": "fala sarcástica em PT-BR, máx 10 palavras", "position": "top-left|top-right|bottom-left|bottom-right" }
  ],
  "floating_emojis": ["emoji1", "emoji2", "emoji3", "emoji4"],
  "caption": "legenda ácida geral em PT-BR, máx 15 palavras"
}

Regras:
- Português do Brasil, gírias permitidas, sem ofensas reais
- Emojis combinando com a vibe da zoeira (não precisam ser literais da cena)
- Sempre retorne "caption" — é o item mais importante
- Retorne SOMENTE o JSON, sem markdown, sem explicação`;
}

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

  const prompt = buildPrompt({ people_count, scene, mood });

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

    if (!Array.isArray(dialogue.dialogues)) dialogue.dialogues = [];
    if (!Array.isArray(dialogue.floating_emojis)) dialogue.floating_emojis = [];

    return res.status(200).json({ success: true, dialogue });
  } catch (err) {
    console.error('Dialogue error:', err.message);
    return res.status(500).json({ error: 'Dialogue generation failed', details: err.message });
  }
};
