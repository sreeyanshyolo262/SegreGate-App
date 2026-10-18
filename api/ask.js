import { askWithContext } from '../lib/ask.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.json(await askWithContext(req.body || {}));
  } catch (e) {
    console.error('ask error:', e);
    res.status(e.status || 500).json({ error: e.message || 'Failed to answer' });
  }
}
