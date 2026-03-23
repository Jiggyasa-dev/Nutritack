const express  = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/analyze-food
 * Body: { imageBase64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
 * Returns structured nutrition data for the food detected in the image.
 */
router.post('/', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a nutrition expert. Analyze this food image and provide detailed nutritional information.

Respond ONLY with a valid JSON object — no markdown, no explanation, no code block. The JSON must have this exact structure:

{
  "name": "Food name (be specific, e.g. 'Grilled Chicken Breast' not just 'Chicken')",
  "emoji": "One relevant emoji for this food",
  "servingSize": "Typical serving description (e.g. '1 medium piece', '1 cup', '100g')",
  "calories": <number per serving>,
  "protein": <grams per serving>,
  "carbs": <grams per serving>,
  "fat": <grams per serving>,
  "fiber": <grams per serving>,
  "sugar": <grams per serving>,
  "sodium": <mg per serving>,
  "confidence": "high" | "medium" | "low",
  "notes": "Brief note about the food (optional health tip, common variants, etc.)",
  "alternativeNames": ["other name 1", "other name 2"]
}

If you cannot identify food in the image, return:
{ "error": "No food detected in image" }

Be as accurate as possible with nutrition values. Use standard nutritional databases as reference.`,
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].text.trim();

    // Strip markdown code fences if model wraps in them
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return res.status(422).json({ error: 'Could not parse nutrition data from image', raw: rawText });
    }

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Analyze food error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
