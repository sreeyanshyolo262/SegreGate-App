import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { waste } = req.body;

    if (!waste || waste.trim() === '') {
      return res.status(400).json({ error: 'Please provide a waste item' });
    }

    const systemPrompt = `You are a waste classification expert. When a user describes an item, classify it into ONE of these categories and give a one-line answer:
- Dry Waste (paper, cardboard, wood, plastics)
- Wet Waste (food scraps, leaves, organic matter)
- Recyclable (metal, glass, paper that can be recycled)
- Non-Recyclable (items that cannot be recycled)
- Medical Waste (medical equipment, masks, syringes)

Respond ONLY with the category name and a very brief explanation. Example: "Dry Waste - This is cardboard paper."`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify this waste: ${waste}` }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_completion_tokens: 100,
      top_p: 1,
      stream: false
    });

    const classification = chatCompletion.choices[0]?.message?.content || "Unable to classify";

    res.json({ waste, classification });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to classify waste' });
  }
}
