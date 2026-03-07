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
    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username must be >= 3 chars, Password >= 6 chars' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userKey = `user:${cleanUsername}`;

    // Check if user exists
    const existing = await upstashCommand(url, token, ['GET', userKey]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password (salt + scrypt)
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');

    const newUser = {
      username: username.trim(),
      auth: { salt, hash },
      createdAt: Date.now(),
      watchlist: []
    };

    // Save to KV
    await upstashCommand(url, token, ['SET', userKey, JSON.stringify(newUser)]);

    return res.status(200).json({ success: true, username: newUser.username, watchlist: newUser.watchlist });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
