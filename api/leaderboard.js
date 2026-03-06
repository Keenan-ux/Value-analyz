export const config = {
  runtime: 'edge',
};

const upstashCommand = async (url, token, commandArgs) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commandArgs)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result; // For GET returns string, for SET returns "OK"
};

export default async function handler(req) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return new Response(JSON.stringify({ error: 'KV Database missing keys' }), { status: 500 });
  }

  try {
    if (req.method === 'GET') {
      const rawRes = await upstashCommand(url, token, ['GET', 'global_leaderboard']);
      const leaderboard = rawRes ? JSON.parse(rawRes) : [];
      return new Response(JSON.stringify(leaderboard), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST') {
      const entry = await req.json();

      if (!entry.ticker || !entry.score) {
        return new Response(JSON.stringify({ error: 'Missing req fields' }), { status: 400 });
      }

      const rawRes = await upstashCommand(url, token, ['GET', 'global_leaderboard']);
      let leaderboard = rawRes ? JSON.parse(rawRes) : [];

      leaderboard = leaderboard.filter(item => item.ticker !== entry.ticker);
      leaderboard.push(entry);
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 25);

      await upstashCommand(url, token, ['SET', 'global_leaderboard', JSON.stringify(leaderboard)]);

      return new Response(JSON.stringify(leaderboard), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
