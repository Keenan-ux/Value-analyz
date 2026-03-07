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
    if (req.method === 'POST') {
      const { username, watchlist } = req.body;
      if (!username) return res.status(400).json({ error: 'Missing username' });

      const cleanUsername = username.trim().toLowerCase();
      const userKey = `user:${cleanUsername}`;

      const rawRes = await upstashCommand(url, token, ['GET', userKey]);
      if (!rawRes) return res.status(404).json({ error: 'User not found' });

      const user = JSON.parse(rawRes);
      user.watchlist = watchlist || []; // overwrite the array

      // Save back to KV
      await upstashCommand(url, token, ['SET', userKey, JSON.stringify(user)]);
      
      return res.status(200).json({ success: true, watchlist: user.watchlist });
    }

    if (req.method === 'GET') {
      const { username } = req.query;
      if (!username) return res.status(400).json({ error: 'Missing username' });

      const cleanUsername = username.trim().toLowerCase();
      const userKey = `user:${cleanUsername}`;

      const rawRes = await upstashCommand(url, token, ['GET', userKey]);
      if (!rawRes) return res.status(404).json({ error: 'User not found' });

      const user = JSON.parse(rawRes);
      return res.status(200).json({ success: true, watchlist: user.watchlist || [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Watchlist Endpoint Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
