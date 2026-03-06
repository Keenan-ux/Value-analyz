# AI Value Analyst

Autonomous fundamental stock analysis powered by the **Kim, Muhn & Nikolaev (2024) methodology** from the University of Chicago Booth School of Business.

## Features

- **I'm Feeling Lucky** — Autonomously scan and discover undervalued stocks
- **Analyze Ticker** — Deep fundamental dive on any specific stock
- **Earnings Analysis** — Post-earnings drift analysis with forward prediction
- **ADR Scanner** — International value opportunities via ADRs
- **Sector Rotation** — Find the best stock in the worst-performing sector
- **Real-time pricing** via Finnhub API
- **AI-powered analysis** via Google Gemini
- **Leaderboard & Watchlist** with persistent local storage
- **PDF Export** via browser print

## Getting Started

### Prerequisites

- Node.js 18+
- A [Gemini API Key](https://aistudio.google.com/apikey) (free tier works)
- A [Finnhub API Key](https://finnhub.io/) (free tier works)

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and enter your API keys in the top bar.

### Build for Production

```bash
npm run build
```

Output goes to `dist/` — deploy anywhere that serves static files (Vercel, Netlify, GitHub Pages, etc.).

## Deploy to Vercel (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework Preset: **Vite**
4. Click Deploy

## Deploy to GitHub Pages

```bash
# In vite.config.js, add: base: '/<repo-name>/'
npm run build
# Then push the dist/ folder or use gh-pages package
```

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Google Gemini API (analysis engine)
- Finnhub API (real-time market data)

## Disclaimer

**Educational and research purposes only. Not financial advice.**

---

*Built with the Chicago Booth AI Value Analysis Protocol*
