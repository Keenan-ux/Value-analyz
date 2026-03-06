import { createClient } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const getStore = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("KV Database not configured");
  return createClient({ url, token });
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getStore();
      const leaderboard = (await db.get('global_leaderboard')) || [];
      return res.status(200).json(leaderboard);
    } catch (error) {
       // if Vercel KV isn't configured properly yet, return empty array to prevent crashing
      return res.status(200).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const entry = req.body;
      
      if (!entry.ticker || !entry.score) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const db = getStore();
      let leaderboard = (await db.get('global_leaderboard')) || [];
      
      // Remove any existing entry for this exact ticker (only keep the highest/latest representation)
      leaderboard = leaderboard.filter(item => item.ticker !== entry.ticker);
      
      leaderboard.push(entry);
      
      // Sort descending by score and keep top 25
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 25);

      await db.set('global_leaderboard', leaderboard);
      
      return res.status(200).json(leaderboard);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update leaderboard. KV may not be configured.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
