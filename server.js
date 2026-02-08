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

app.post('/api/classify', async (req, res) => {
  try {
    const { waste } = req.body;
    
    if (!waste || waste.trim() === '') {
      return res.status(400).json({ error: 'Please provide a waste item' });
    }

    const systemPrompt = `You are a waste classification expert. Classify the item into ONE of these 3 categories. Give a one-line answer with ONLY the category and brief reason.

1. WET WASTE (Green Bin) - Biodegradable waste:
   - Fruit/vegetable peels, leftover food, eggshells, meat/fish bones
   - Coffee grounds, tea bags, garden leaves, flowers
   - Coconut flesh (not shell), flour, grains, dairy products

2. DRY WASTE (Recyclables) - Clean & dry items:
   - Paper: newspapers, magazines, cardboard, cartons, tetra packs (rinsed)
   - Plastics: bottles, containers, wrappers, packets (washed & dry)
   - Metal & Glass: aluminium cans, tins, unbroken glass bottles
   - Other: rubber, thermocol, sponges, coconut shells, wood pieces, ceramics
   - E-waste (batteries, CDs, bulbs) - mention to hand over separately

3. REJECT WASTE (Red Bin) - Goes to landfill:
   - Sanitary: diapers, sanitary napkins, tissues, bandages, condoms, hair
   - Sharps: blades, razors, syringes (wrap in newspaper)
   - Hazardous: paints, chemicals, medicines
   - Broken glass (wrap in newspaper)
   - Heavily soiled food containers, construction debris

Respond format: "CATEGORY - Brief reason." Example: "DRY WASTE - This is a plastic bottle, rinse and dry before disposal."`;

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
