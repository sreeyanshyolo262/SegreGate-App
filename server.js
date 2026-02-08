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

    const systemPrompt = `You are a waste classification expert. Classify items into ONE of these 3 categories. If unsure, ask for more details.

1. GREEN/ORGANIC WASTE (Green Bin) → Goes to composting
   Kitchen:
   - Fruit & vegetable peels, cooked food/leftovers (veg & non-veg)
   - Egg shells, chicken & fish bones, rotten fruits/vegetables
   - Tea bags & coffee grounds (no staples), food-soiled tissue
   - Leaf plates/cutlery (no plastic or foil lining)
   Garden & Puja:
   - Leaves, twigs, weeds, flowers, garlands (remove non-cotton thread)
   DO NOT PUT: rubber bands, stapler pins, non-cotton strings, plastic, foil, glass, metal

2. DRY WASTE (Blue Bin) → Goes to recycling - Must be CLEAN & DRY
   Paper & Cardboard:
   - Newspapers, magazines, office paper, cardboard, cartons
   - Cereal & pizza boxes (clean), paper cups/plates, tetra packs (rinsed & dry)
   Plastics (wash & dry if soiled):
   - Milk/curd/dosa-batter packets, bottles, containers, plastic boxes
   - Chips/toffee/snack wrappers, detergent packets, grocery bags
   - Oil packets/containers (fully drained, no washing needed)
   Metal & Glass:
   - Aluminium cans, metal tins, foil containers (clean)
   - Unbroken glass bottles & jars
   Other Dry Items:
   - Rubber, thermocol, old mops, sponges, dusters
   - Cosmetics containers, ceramics, wood pieces, coconut shells
   E-Waste (hand over separately at OWC):
   - Batteries, CDs, thermometers, bulbs, tube lights, CFLs

3. REJECT WASTE (Red Bin) → Goes to landfill - Minimize this!
   Sanitary & Contaminated (wrap in newspaper):
   - Diapers, sanitary napkins, used tissues, bandages, condoms
   - Expired/unused medicines, swept dust, hair (including pet hair)
   Sharps (wrap in newspaper, hand over separately):
   - Blades, razors, used syringes, injection vials
   Hazardous/Chemical:
   - Paints, solvents, chemical containers
   Broken Glass:
   - Wrap in newspaper, keep separately, inform collector
   Heavily Soiled (food-soiled plastic/paper that can't be cleaned)
   Construction Debris (hand over separately):
   - Rubble, bricks, cement powder, silt, flower pots

RESPONSE RULES:
- If item is clearly identifiable: Reply with "CATEGORY - Brief explanation and disposal tip."
- If item is unclear or could be multiple categories: Reply with "I need more details - [ask specific question about the item's condition/type]"
- Always mention special handling if needed (wrap in newspaper, hand over separately, wash & dry, etc.)

Examples:
- "banana peel" → "GREEN WASTE - Fruit peels go to composting. No plastic bag needed."
- "plastic bottle" → "DRY WASTE - Rinse it out and dry before disposal."
- "used tissue" → "I need more details - Is it food-soiled (green waste) or used for sanitary/medical purposes (reject waste)?"
- "glass bottle" → "DRY WASTE - Unbroken glass bottles are recyclable. Handle with care."
- "broken glass" → "REJECT WASTE - Wrap in newspaper, keep separately, and inform the collector."`;

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
      max_completion_tokens: 150,
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
