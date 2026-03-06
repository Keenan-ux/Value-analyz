const upstashCommand = async (url, token, commandArgs) => {
  const res = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commandArgs)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
};

export default async function handler(req, res) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'KV Database missing keys' });
  }

  try {
    if (req.method === 'GET') {
      const rawRes = await upstashCommand(url, token, ['GET', 'global_etf_leaderboard']);
      const leaderboard = rawRes ? JSON.parse(rawRes) : [];
      return res.status(200).json(leaderboard);
    }

    if (req.method === 'POST') {
      // Vercel auto-parses req.body for standard API routes
      let entry = req.body;
      if (typeof entry === 'string') {
        try { entry = JSON.parse(entry); } catch(e) {}
      }

      if (!entry || !entry.ticker || !entry.score) {
        return res.status(400).json({ error: 'Missing req fields' });
      }

      const rawRes = await upstashCommand(url, token, ['GET', 'global_etf_leaderboard']);
      let leaderboard = rawRes ? JSON.parse(rawRes) : [];

      // Find existing entry
      const existing = leaderboard.find(item => item.ticker === entry.ticker);
      let recentScores = existing?.recentScores || [];
      
      // Add new score and cap at 10
      recentScores.push(entry.score);
      if (recentScores.length > 10) recentScores.shift();

      // Calculate median
      const sorted = [...recentScores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
      
      // Update entry with rolling median
      entry.score = median;
      entry.recentScores = recentScores;

      let medianVerdict = "Strong Avoid";
      if (median >= 80) medianVerdict = "Strong Buy";
      else if (median >= 70) medianVerdict = "Buy";
      else if (median >= 55) medianVerdict = "Hold";
      else if (median >= 45) medianVerdict = "Avoid";
      entry.verdict = medianVerdict;

      leaderboard = leaderboard.filter(item => item.ticker !== entry.ticker);
      leaderboard.push(entry);
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 50);

      await upstashCommand(url, token, ['SET', 'global_etf_leaderboard', JSON.stringify(leaderboard)]);

      return res.status(200).json(leaderboard);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
