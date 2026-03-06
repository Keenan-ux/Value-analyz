import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This plugin mocks the Vercel serverless function for local development
const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server) {
    let mockLeaderboard = [];
    
    server.middlewares.use('/api/leaderboard', (req, res, next) => {
      if (req.url !== '/' && req.url !== '') return next();
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(mockLeaderboard));
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const entry = JSON.parse(body || '{}');
            if (entry.ticker) {
              mockLeaderboard = mockLeaderboard.filter(i => i.ticker !== entry.ticker);
              mockLeaderboard.push(entry);
              mockLeaderboard.sort((a,b) => b.score - a.score);
            }
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(mockLeaderboard));
          } catch(e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: "Server error" }));
          }
        });
      }
    });

    server.middlewares.use('/api/keys', (req, res, next) => {
      if (req.url !== '/' && req.url !== '') return next();
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { pin } = JSON.parse(body || '{}');
          if (pin === '1234') { // The mock PIN for local testing is 1234
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ geminiKey: 'mock_gemini_key', finnhubKey: 'mock_finnhub_key' }));
          } else {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid PIN' }));
          }
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Server Error' }));
        }
      });
    });
  }
});

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
})
