import crypto from 'crypto';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'KV Database missing keys' });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userKey = `user:${cleanUsername}`;

    // Fetch user
    const rawRes = await upstashCommand(url, token, ['GET', userKey]);
    if (!rawRes) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = JSON.parse(rawRes);

    // Verify password
    const { salt, hash } = user.auth;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');

    if (hash !== verifyHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return res.status(200).json({ success: true, username: user.username, watchlist: user.watchlist || [] });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
