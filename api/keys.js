export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pin } = req.body;
  const validPin = process.env.APP_PIN;
  
  if (!pin || pin !== validPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  return res.status(200).json({
    geminiKey: process.env.SECURE_GEMINI_KEY || '',
    finnhubKey: process.env.SECURE_FINNHUB_KEY || ''
  });
}
