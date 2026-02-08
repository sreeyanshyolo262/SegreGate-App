import express from 'express';
import cors from 'cors';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/classify-waste', async (req, res) => {
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
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Classify this waste: ${waste}`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_completion_tokens: 100,
      top_p: 1,
      stream: false
    });

    const classification = chatCompletion.choices[0]?.message?.content || "Unable to classify";
    
    res.json({ 
      waste: waste,
      classification: classification
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to classify waste. Make sure your GROQ_API_KEY is set.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure you have GROQ_API_KEY in your .env file');
});
