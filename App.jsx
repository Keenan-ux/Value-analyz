import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONSTANTS & CONFIG ───
const QUOTE_PROXY = "https://quote-proxy-1nj5vhpae-keenans-projects-22e06faf.vercel.app";
const RUNTIME_API_KEY = ""; // Runtime provides the key automatically

// Expanded from ~125 to 250+ vetted stocks to deeply dilute LLM biases
const MODES = [
  { id: "analyze", label: "Analyze Ticker", desc: "Deep dive on a specific stock or ETF", icon: "✦", borderClass: "border-[#D0A6AA]", shadowClass: "hover:shadow-[#D0A6AA]/20", textClass: "group-hover:text-[#D0A6AA]" },
  { id: "scan", label: "I'm Feeling Lucky", desc: "Autonomously find undervalued stocks", icon: "☘️", borderClass: "border-[#9CAF88]", shadowClass: "hover:shadow-[#9CAF88]/20", textClass: "group-hover:text-[#9CAF88]" },
  { id: "predict", label: "Predictions Beta", desc: "Swing trade probability testing", icon: "✧", borderClass: "border-[#AFA192]", shadowClass: "hover:shadow-[#AFA192]/20", textClass: "group-hover:text-[#AFA192]" },
];

const TICKER_POOLS = {
  MEGA: ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSM','BRK.B','LLY','V','TSLA','JPM','WMT','UNH','MA','JNJ','XOM','PG','HD','COST','AVGO','MRK','ABBV','CVX','CRM','ASML','NVO','TM','AZN','PEP','KO','BAC','ORCL','ADBE','MCD','LIN','NFLX','AMD','CSCO','ABT','DHR','PDD','TMUS','TMO','INTC','CMCSA','PFE','WFC','IBM','QCOM'],
  LARGE: ['NOW','UBER','AMGN','PLTR','SNOW','SQ','SHEL','SAP','SONY','RY','TD','BA','GE','CAT','COP','PM','DIS','TXN','SPGI','HON','INTU','AMAT','UNP','AXP','SYK','LOW','GS','BLK','ELV','MDT','DE','LMT','ADI','GILD','ISRG','BKNG','CVS','VRTX','REGN','ZTS','BSX','BDX','MDLZ','SO','CI','DUK','C','CB','PGR','MMC'],
  MID: ['HOOD','SOFI','CHWY','ROKU','DOCU','DBX','PINS','SNAP','WDC','MRO','M','JWN','KSS','GPS','YELP','TRIP','Z','GME','AMC','BB','ETSY','WAY','CRSR','PTON','SPOT','NU','NIO','PBR','VALE','STLA','FSLR','PCAR','ENPH','FSLY','SEDG','RUN','NET','PLUG','SPCE','BYND','DKNG','LCID','RIVN','QS','LAZR','CHPT','BLNK','TTD','PENN','DKS'],
  SMALL: ['UPST','LMND','ROOT','RDFN','OPEN','AFRM','MQ','TOST','COUR','UDEMY','DUOL','CVNA','RIOT','MARA','HUT','BITF','URBN','CROX','SHAK','TXRH','WEN','PZZA','BLMN','VFS','MLCO','GGB','SID','PAM','AI','PATH','C3','STEM','SOUN','ALLO','PACB','CRSP','NVTA','TWST','EXAS','NARI','SDGR','GH','TXG','CFLT','VEEV','PEN','MASI','ICUI','TMDX'],
  MICRO: ['ASTS','RKLB','SPIR','BKSY','PL','SATS','GSAT','ACHR','JOBY','LILM','EVTL','BLDE','ARLO','KOSS','SNDL','TLRY','FUBO','WKHS','RIDE','NKLA','GOEV','PSNY','PTRA','ARVL','HYLN','MULN','FSR','XOS','REE','GGR','ZETA','IONQ','VLD','OUST','ASTR','RDW','INVZ','LIDR','MVIS','AEVA','CPTN','VLDR','HSAI','INDI','QSI','RGTI','ARQQ','MAXN','KLR','MNDY']
};

const SYSTEM_PROMPT = `You are an autonomous value analysis system acting exactly in accordance with the Kim, Muhn & Nikolaev (2024) methodology from the University of Chicago Booth School of Business. You perform deep fundamental analysis using Chain-of-Thought reasoning.

CRITICAL INSTRUCTIONS:
1. STRICT DATA SOURCE RULE: Current pricing and quantitative metrics MUST be exclusively sourced from the provided "LIVE MARKET DATA" block (Finnhub API). DO NOT use Google Search for pricing data.
2. QUALITATIVE SEARCH ONLY: Use Google Search to find qualitative data, news, historical earnings context, and narrative analysis.
3. CHICAGO BOOTH HISTORICAL CONTEXT: You MUST actively search for and analyze at least the 3 most recent quarterly earnings reports/transcripts to establish a trend in management execution, language changes, and guidance credibility. Do not just look at the most recent quarter.
4. FALLBACK EXCEPTION: If and ONLY if the "LIVE MARKET DATA" block is completely missing, you may fallback to using Google Search for the current stock price.
5. NO PLACEHOLDERS: NEVER output "[$XX.XX]", "[Symbol]", or "[Searching...]". Fill out EVERY field with real data.
6. CHAIN OF THOUGHT: You MUST follow the exact output structure below. You will perform the textual analysis first (DuPont, Income, Balance Sheet) to build your reasoning BEFORE you calculate the final scores and verdict.

OUTPUT FORMAT - You MUST use this exact structure with these exact === markers. Do not deviate:

===HEADER===
TICKER: Actual Symbol
COMPANY: Actual Full Name
SECTOR: Actual Sector
MARKET_CAP: Actual Market Cap
CURRENT_PRICE: $Actual.Price
ROBINHOOD: Yes/Likely

===SCREENING_RATIONALE===
Brief context on why this name is being analyzed. 2-3 sentences.

===INCOME_STATEMENT===
Apply the DuPont framework. Break down ROE into profit margin, asset turnover, and financial leverage. Analyze revenue trends and EPS history. 4-8 sentences with real numbers.

===BALANCE_SHEET===
Cash, debt, D/E, current ratio, book value. 4-6 sentences with real numbers.

===CASH_FLOW===
OCF, FCF, FCF yield, capital allocation. 4-6 sentences with real numbers.

===VALUATION===
Relative valuation vs peers, intrinsic value, margin of safety. 4-8 sentences.

===QUALITATIVE===
Moat, management, competitive position. 4-6 sentences.

===CATALYSTS===
3-5 specific upcoming catalysts as sentences.

===RISKS===
3-5 key risks as sentences.

===VALUE_TRAP_CHECK===
Check against value trap indicators. Which red flags present vs clear.

===EARNINGS_FORECAST===
Direction: [Increase / Decrease / Flat]
Rationale: 2-3 sentences predicting the direction of future earnings based on your analysis above.

===SOURCES===
List exactly 5 specific sources you used for this analysis. YOU MUST include links to the last 3 quarterly earnings transcripts/reports you analyzed. 
CRITICAL FORMATTING: You MUST format every single source as a proper Markdown link: [Source Title](https://actual-url.com). Do not just list the titles.

===SCORES===
EARNINGS_QUALITY: 1-10
BALANCE_SHEET: 1-10
CASH_FLOW: 1-10
VALUATION: 1-10
CAPITAL_ALLOCATION: 1-10
COMPETITIVE_MOAT: 1-10
MANAGEMENT: 1-10
CATALYST: 1-10
RISK_PROFILE: 1-10 (NOTE: 10 = Lowest Risk/Safest, 1 = Highest Risk/Most Dangerous)

===VERDICT===
Strong Buy / Buy / Hold / Avoid / Strong Avoid

===THESIS===
3-5 sentence final investment thesis based on all accumulated data.

===FAIR_VALUE===
BEAR: $Actual.Price
BASE: $Actual.Price
BULL: $Actual.Price

===MONITORING===
3-5 events/thresholds to watch, including next earnings date.

===POSITION_SIZING===
Sizing guidance based on conviction and defined exit thesis.

RULES:
- Always use the provided Finnhub LIVE MARKET DATA for prices and metrics if available.
- Use ranges, not point estimates. Say "the data suggests" not "the stock will."
- Score each dimension 1-10.
- Strong Buy >= 80/90, Buy >= 70/90, Hold 55-69, Avoid < 55, Strong Avoid < 45.
- This is for educational/research purposes only, not financial advice.`;

const PREDICTION_PROMPT = `You are an AI-driven directional analysis system. Your task is to produce 1-5 day directional predictions on SPY, sector ETFs, or individual stocks. You operate as a systematic, multi-factor synthesis engine.
"No Trade" is the default output. You only issue directional calls when multiple factors converge with at least 3/5 conviction. Selectivity IS the edge.

PHASE 1: AUTONOMOUS DATA SOURCING
Use web search to gather:
1. Macro Calendar (Next 1-5 Trading Days): FOMC, CPI, PPI, NFP, etc.
2. Current Positioning & Volatility: VIX, put/call ratio, Gamma exposure.
3. Sentiment: AAII, CNN Fear & Greed, fund flows.
4. Technical Context: 50/200-day MAs, 52-week highs/lows, RSI.
5. Macro Regime: 10Y yield, DXY, Crude oil.
6. Narrative / Catalysts: Dominant narrative, geopolitics, sector rotation.
7. For Single Stocks: Final overlay of recent earnings, analyst revisions, insider buying.

PHASE 2: FACTOR SCORING
Weight the bullish vs bearish factors. Check for sentiment extremes (e.g. Extreme Fear = contrarian bullish).

PHASE 3: STRUCTURED OUTPUT
You MUST use this exact structure with these exact === markers. Do not deviate. DO NOT use generic placeholders inside the actual data generation.

===HEADER===
TICKER: Actual Symbol
COMPANY: Actual Name
SECTOR: Actual Sector
CURRENT_PRICE: $Actual.Price

===CALL_SUMMARY===
DIRECTION: Bullish / Bearish / No Trade
CONVICTION: 1-5
TIME_HORIZON: Briefly specify
TARGET: Price or %
STOP: Invalidation level
CATALYST_DEPENDENCY: Yes/No + Brief reason
BINARY_EVENT: Exact name of the catalyst/event (e.g. FDA PDUFA for Drug X, Q3 Earnings)
EVENT_DATE: Exact date of the event (e.g. Nov 14, 2025)

===THESIS===
2-4 sentences explaining the core rationale. Why this direction, why now.

===KEY_RISKS===
What could go wrong. Identify the largest single risk to the call.

===CONDITIONAL_SCENARIOS===
Scenario A (Base): Direction + target.
Scenario B (Alternative): Direction + target.

===SOURCES===
List specific sources you used, including a direct link verifying the BINARY_EVENT and EVENT_DATE. Format as Markdown links: [Source Title](https://actual-url.com).
`;

// ─── HELPER FUNCTIONS ───

// TRUE Cryptographic Randomness (Bypasses Math.random browser seed biases)
const secureRandom = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / 4294967296; // Divide by max uint32 + 1 to get float between 0 and 1
};

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error("Invalid Gemini API Key (401 Unauthorized). Please check your key.");
        if (response.status === 404) throw new Error("404_MODEL_NOT_FOUND");
        throw new Error(errData?.error?.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const callGemini = async (promptText, sysPrompt, apiKey, files = []) => {
  const parts = [{ text: promptText }];
  
  // Add base64 pdf files if any exist
  files.forEach(f => {
    parts.push({
      inlineData: {
        mimeType: f.type,
        data: f.base64
      }
    });
  });

  const payload = {
    systemInstruction: { parts: [{ text: sysPrompt }] },
    contents: [{ parts }],
    tools: [{ "google_search": {} }]
  };

  if (apiKey === RUNTIME_API_KEY) {
    const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const modelsToTry = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-001",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-lite-exp",
    "gemini-3.0-flash",
    "gemini-2.5-flash"
  ];

  for (const modelName of modelsToTry) {
    try {
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      if (err.message === "404_MODEL_NOT_FOUND") continue; 
      throw err; 
    }
  }
  throw new Error("Could not find a valid model string. All fallback models returned 404 errors.");
};

const fetchFinnhubData = async (tk, key) => {
  if (key && key.trim().length > 0) {
    const token = key.trim();
    const qRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${tk}&token=${token}`);
    const raw = await qRes.json();
    
    if (!qRes.ok || raw.c === undefined || raw.c === 0) {
      throw new Error(raw.error || "Invalid Finnhub response or ticker not found");
    }
    
    let prof = {}, met = {metric:{}};
    try { 
      const pRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${tk}&token=${token}`);
      if (pRes.ok) prof = await pRes.json();
    } catch(e) { console.warn("Profile fetch failed", e); }
    
    try { 
      const mRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${tk}&metric=all&token=${token}`);
      if (mRes.ok) met = await mRes.json();
    } catch(e) { console.warn("Metric fetch failed", e); }
    
    const formatMC = (mc) => {
      if (!mc) return undefined;
      return mc > 1000 ? (mc / 1000).toFixed(2) + "B" : mc.toFixed(2) + "M";
    };

    return {
      price: raw.c, change: raw.d, changePct: raw.dp, high: raw.h, low: raw.l, open: raw.o, prevClose: raw.pc,
      company: prof.name, sector: prof.finnhubIndustry, marketCap: formatMC(prof.marketCapitalization),
      wk52High: met.metric?.['52WeekHigh'], wk52Low: met.metric?.['52WeekLow'],
      pe: met.metric?.peBasicExclExtraTTM || met.metric?.peNormalizedAnnual || met.metric?.peExclExtraTTM,
      pb: met.metric?.pbAnnual, divYield: met.metric?.dividendYieldIndicatedAnnual
    };
  } else {
    const r = await fetch(`${QUOTE_PROXY}/api/quote?symbol=${tk}`);
    const d = await r.json();
    if (r.ok && d.price !== undefined) return d;
    throw new Error(d.error || "Proxy error");
  }
};

const fetchETFHoldings = async (tk, key, geminiKey, expectedCount = 500) => {
  // Try Finnhub first if a key exists
  if (key && key.trim().length > 0) {
    const token = key.trim();
    try {
      const res = await fetch(`https://finnhub.io/api/v1/etf/holdings?symbol=${tk}&token=${token}`);
      const data = await res.json();
      if (res.ok && data.holdings && data.holdings.length > 0) {
        return data.holdings;
      }
    } catch(e) {
      console.warn("Finnhub ETF fetch failed, falling back to Gemini LLM", e);
    }
  }

  // Fallback to Gemini AI Web Search
  if (!geminiKey) throw new Error("Finnhub requires a premium key. No Gemini API key provided for the web search fallback.");
  
  console.log(`Using Gemini to scrape ETF holdings for ${tk}...`);
  const prompt = `Search the web for the official current holdings of the ETF ticker ${tk}. Process the top ${expectedCount} constituents. Return ONLY a raw JSON array of objects. Each object must have exactly two keys: "symbol" (the stock ticker string) and "percent" (the exact weight percentage as a number, e.g. 6.54 for 6.54%). Do not include any HTML, markdown formatting, backticks, or other text. Sort them from highest percent to lowest percent.`;
  const sysPrompt = "You are a precise JSON extractor. Output ONLY the raw JSON array. Start with [ and end with ]. No other text.";
  
  try {
    const text = await callGemini(prompt, sysPrompt, geminiKey, []);
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const holdings = JSON.parse(cleanText);
    if (!Array.isArray(holdings) || holdings.length === 0) throw new Error("Invalid array returned by Gemini");
    return holdings;
  } catch (err) {
    throw new Error("Failed to fetch ETF holdings: Finnhub requires premium & LLM web search extraction failed.");
  }
};


const parseAnalysis = (text) => {
  const sections = {};
  const regex = /===(\w+)===/g;
  let match, markers = [];
  while ((match = regex.exec(text)) !== null) markers.push({ key: match[1], index: match.index, end: match.index + match[0].length });
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    sections[markers[i].key] = text.substring(start, end).trim();
  }
  return sections;
};

const parseKV = (t) => { if (!t) return {}; const f = {}; t.split("\n").forEach(l => { const m = l.match(/^(\w+):\s*(.+)/); if (m) f[m[1]] = m[2].trim(); }); return f; };
const parseScores = (t) => { if (!t) return {}; const s = {}; t.split("\n").forEach(l => { const m = l.match(/^(\w+):\s*(\d+)/); if (m) s[m[1]] = parseInt(m[2]); }); return s; };
const parseFV = (t) => { if (!t) return {}; const v = {}; t.split("\n").forEach(l => { const m = l.match(/^(BEAR|BASE|BULL):\s*(.+)/i); if (m) v[m[1].toUpperCase()] = m[2].trim(); }); return v; };

const renderLinks = (text) => {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (match) return <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-400 underline break-all">{match[1]}</a>;
    return part.split(/(https?:\/\/[^\s)]+)/g).map((sub, j) => 
      sub.match(/^https?:\/\//) ? <a key={`${i}-${j}`} href={sub} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-400 underline break-all">{sub}</a> : sub
    );
  });
};

// ─── UI COMPONENTS ───
const Badge = ({ v }) => {
  const x = (v || "").trim().toLowerCase();
  let colors = "bg-brand-gold/15 text-brand-gold border-brand-gold";
  if (x === "strong buy") colors = "bg-green-500/15 text-green-500 border-green-500";
  else if (x === "buy") colors = "bg-green-400/10 text-green-400 border-green-400";
  else if (x === "hold") colors = "bg-amber-500/10 text-amber-500 border-amber-500";
  else if (x === "avoid") colors = "bg-red-400/10 text-red-400 border-red-400";
  else if (x === "strong avoid") colors = "bg-red-500/15 text-red-500 border-red-500";
  
  return <span className={`inline-block px-4 py-1.5 rounded border font-mono text-sm font-bold tracking-wide uppercase ${colors}`}>{v}</span>;
};

const ScoreBar = ({ label, score }) => {
  const color = score >= 7 ? "bg-green-500 text-green-500" : score >= 5 ? "bg-amber-500 text-amber-500" : "bg-red-500 text-red-500";
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-36 text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color.split(' ')[0]}`} style={{ width: `${(score || 0) * 10}%` }} />
      </div>
      <span className={`w-8 text-right font-mono text-sm font-bold ${color.split(' ')[1]}`}>{score || 0}</span>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div className="glass-panel p-6 mb-5 rounded-2xl print:break-inside-avoid transition-all duration-300 hover:shadow-2xl hover:border-brand-border/80">
    <div className="flex items-center gap-2.5 mb-3.5">
      <span className="text-base">{icon}</span>
      <h3 className="m-0 text-[13px] font-mono text-[#B8860B] uppercase tracking-widest font-semibold">{title}</h3>
    </div>
    <div className="text-sm leading-relaxed text-slate-200">{children}</div>
  </div>
);

const MetricBox = ({ label, value }) => (
  <div className="glass-panel rounded-xl p-3.5 text-center bg-brand-dark/40 hover:bg-brand-dark/60 transition-colors">
    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">{label}</div>
    <div className="text-[15px] font-mono font-semibold text-slate-200">{value}</div>
  </div>
);

const FairValueVisualizer = ({ current, fv, quote }) => {
  const parseNum = (str) => {
    if (!str) return null;
    const match = str.match(/\$?\s*([0-9,.]+)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  };

  const c = current;
  const bear = parseNum(fv.BEAR);
  const base = parseNum(fv.BASE);
  const bull = parseNum(fv.BULL);
  const low52 = quote?.wk52Low || null;
  const high52 = quote?.wk52High || null;

  if (!c || !base) return null;

  const mosPct = ((base - c) / base) * 100;
  const isUndervalued = mosPct > 0;
  const color = isUndervalued ? "#22C55E" : "#EF4444";
  const colorClass = isUndervalued ? "text-green-500" : "text-red-500";

  const allNums = [c, bear, base, bull, low52, high52].filter(n => n !== null);
  if (allNums.length < 2) return null;
  
  const minVal = Math.min(...allNums) * 0.95;
  const maxVal = Math.max(...allNums) * 1.05;
  const range = maxVal - minVal;
  const getPct = (val) => Math.max(0, Math.min(100, ((val - minVal) / range) * 100));

  return (
    <div className="mt-5 pt-8 px-6 pb-12 bg-slate-900/40 rounded-lg border border-[#1E293B] print:break-inside-avoid">
      <div className="flex justify-between items-start mb-12">
        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Margin of Safety</div>
          <div className={`text-2xl font-mono font-bold ${colorClass}`}>
            {isUndervalued ? `${mosPct.toFixed(1)}% Discount` : `${Math.abs(mosPct).toFixed(1)}% Premium`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Base Value</div>
          <div className="text-xl font-mono font-semibold text-[#B8860B]">${base.toFixed(2)}</div>
        </div>
      </div>

      <div className="relative h-1.5 bg-[#1E293B] rounded-full mx-5">
        {low52 && high52 && <div className="absolute top-[2px] bottom-[2px] bg-slate-700 rounded-sm" style={{ left: `${getPct(low52)}%`, right: `${100 - getPct(high52)}%` }} />}
        {bear && bull && (
          <div className="absolute -top-1 -bottom-1 bg-[#B8860B]/15 border-x border-dashed border-[#B8860B]/50 rounded-sm" style={{ left: `${getPct(Math.min(bear, bull))}%`, right: `${100 - getPct(Math.max(bear, bull))}%` }}>
            <div className="absolute -top-5 w-full text-center text-[9px] font-mono text-[#B8860B]/80 tracking-wider">FV ZONE</div>
          </div>
        )}
        
        {low52 && <div className="absolute top-4 -translate-x-1/2 text-[10px] font-mono text-slate-400 text-center" style={{ left: `${getPct(low52)}%` }}>52w L<br/>${low52.toFixed(2)}</div>}
        {high52 && <div className="absolute top-4 -translate-x-1/2 text-[10px] font-mono text-slate-400 text-center" style={{ left: `${getPct(high52)}%` }}>52w H<br/>${high52.toFixed(2)}</div>}
        
        {bear && !bull && (
          <div className="absolute -top-1 -bottom-1 w-0.5 bg-red-500" style={{ left: `${getPct(bear)}%` }}>
            <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 text-[10px] font-mono text-red-500 font-semibold">BEAR</div>
          </div>
        )}
        {base && (
          <div className="absolute -top-2 -bottom-2 w-0.5 bg-[#B8860B] z-10" style={{ left: `${getPct(base)}%` }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#B8860B] font-bold">BASE</div>
          </div>
        )}
        {bull && !bear && (
          <div className="absolute -top-1 -bottom-1 w-0.5 bg-green-500" style={{ left: `${getPct(bull)}%` }}>
            <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 text-[10px] font-mono text-green-500 font-semibold">BULL</div>
          </div>
        )}
        
        <div className="absolute -top-[7px] w-5 h-5 rounded-full -translate-x-1/2 border-4 border-slate-900 z-20" style={{ left: `${getPct(c)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}>
          <div className="absolute -bottom-[26px] left-1/2 -translate-x-1/2 text-xs font-mono font-bold" style={{ color }}>${c.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN LAYOUT COMPONENTS ───
const TopNav = ({ useFinnhub, setUseFinnhub, geminiKey, setGeminiKey, finnhubKey, setFinnhubKey, hasData, onReset, onUnlockClick, isUnlocked, isLoggedIn, username, onLoginClick, onLogout }) => (
  <header className="print:hidden sticky top-0 z-50 border-b border-brand-border bg-brand-panel/60 backdrop-blur-xl px-3 sm:px-7 py-2.5 flex items-center justify-between shadow-sm">
    
    {/* Left Side: Logo & Subtitle */}
    <div className="flex items-baseline gap-1.5 sm:gap-2 hover:scale-105 transition-transform duration-300 w-auto truncate mr-2">
      <div className="text-[17px] sm:text-[18px] font-light tracking-tight text-slate-200 leading-none shrink-0">Booth <span className="text-[#B8860B] font-semibold">Check</span></div>
      <div className="text-[7px] sm:text-[9px] text-slate-500 font-mono tracking-widest uppercase truncate pb-0.5">
        <span className="hidden sm:inline">Powered by the Chicago Booth method</span>
        <span className="sm:hidden">Chicago Booth Protocol</span>
      </div>
    </div>
    
    {/* Right Side: Actions */}
    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
      
      {/* Mobile-only Reset Button */}
      {hasData && (
        <button onClick={onReset} className="sm:hidden bg-transparent border border-[#1E293B] text-slate-400 px-1.5 py-1 rounded cursor-pointer text-[8px] uppercase tracking-widest font-mono">
          Reset
        </button>
      )}

      {/* Cloud Auth */}
      {isLoggedIn ? (
        <div className="flex items-center gap-1.5 bg-[#111827] px-2 py-1 rounded-md border border-[#1E293B]">
          <span className="text-[#B8860B] text-[8px] sm:text-[10px]">🟢</span>
          <div className="text-slate-200 font-mono text-[9px] sm:text-[10px] font-bold tracking-wider max-w-[45px] sm:max-w-none truncate">{username}</div>
          <button onClick={onLogout} className="hidden sm:inline text-[9px] font-mono text-slate-500 hover:text-red-400 ml-1 cursor-pointer bg-transparent border-none p-0 underline decoration-slate-600 underline-offset-2">Log out</button>
        </div>
      ) : (
        <button onClick={onLoginClick} className="bg-[#111827] border border-[#B8860B]/50 text-[#B8860B] font-mono text-[8px] sm:text-[10px] uppercase tracking-widest py-1 px-2 sm:px-3 rounded-md cursor-pointer">
          Sign In
        </button>
      )}

      {/* Keys (Desktop) */}
      <div className="flex flex-col gap-0.5 hidden xl:flex">
        <label className="text-[8px] text-slate-400 font-mono uppercase">Gemini</label>
        <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Key..." className="w-16 px-1.5 py-1 text-[10px] font-mono bg-[#0A0E17] border border-[#1E293B] rounded text-slate-200 outline-none" />
      </div>

      <div className="flex flex-col gap-0.5 hidden xl:flex">
        <label className="text-[8px] text-slate-400 font-mono uppercase">Finnhub</label>
        <input type="password" value={finnhubKey} onChange={e => setFinnhubKey(e.target.value)} placeholder="Key..." className="w-16 px-1.5 py-1 text-[10px] font-mono bg-[#0A0E17] border border-[#1E293B] rounded text-slate-200 outline-none" />
      </div>

      {/* Unified Protocol Connections Block */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 bg-[#111827] px-2 py-1 sm:py-1.5 rounded-md border border-[#1E293B]">
        <button onClick={() => setUseFinnhub(!useFinnhub)} className="flex items-center justify-center cursor-pointer bg-transparent border-none p-0 group" title={useFinnhub ? "Live API ON" : "Live API OFF"}>
           <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${useFinnhub ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`} />
           <span className="hidden md:inline font-mono text-[9px] uppercase tracking-widest ml-1.5 text-slate-400">Data</span>
        </button>
        
        <div className="w-[1px] h-3 sm:h-3.5 bg-[#1E293B]"></div>
        
        <button onClick={onUnlockClick} className="bg-transparent border-none p-0 flex items-center justify-center cursor-pointer text-[10px] sm:text-[11px] text-[#B8860B]" title="Unlock Advanced Methods">
          {isUnlocked ? '🔓' : '🔒'}
        </button>
      </div>

      {/* Desktop-only Reset Button */}
      {hasData && (
        <button onClick={onReset} className="hidden sm:block bg-transparent border border-[#1E293B] text-slate-400 px-3 py-1.5 rounded cursor-pointer text-[11px] uppercase tracking-widest font-mono ml-1">
          New Scan
        </button>
      )}
    </div>
  </header>
);

const DragNumberInput = ({ value, onChange, min = 1, max = 100 }) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    startY.current = e.clientY || (e.touches && e.touches[0].clientY);
    startVal.current = value;
    document.body.style.userSelect = "none";
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaY = startY.current - clientY;
    
    // Sensitivity: 1 unit change per 3px of drag
    const newVal = Math.max(min, Math.min(max, startVal.current + Math.floor(deltaY / 3)));
    if (newVal !== value) onChange(newVal);
  }, [isDragging, value, min, max, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -1 : 1;
      const newVal = Math.max(min, Math.min(max, value + delta));
      if (newVal !== value) onChange(newVal);
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, [value, min, max, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center p-3 border-2 border-[#B8860B]/30 bg-[#B8860B]/5 rounded-lg cursor-ns-resize hover:border-[#B8860B] transition-colors relative touch-none select-none"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      title="Scroll or Drag up/down to change"
    >
      <div className="absolute inset-y-0 left-0 flex flex-col items-center justify-center pl-3 text-[#B8860B]/40 text-[10px] space-y-3 pointer-events-none">
        <span>▲</span>
        <span>▼</span>
      </div>
      <div className="text-3xl font-mono font-bold text-[#B8860B]">
        {value}
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-[10px] font-mono text-[#B8860B]/60 pointer-events-none uppercase tracking-widest">
        {value === 1 ? 'Ticker' : 'Tickers'}
      </div>
    </div>
  );
};

const WelcomeScreen = ({ setMode, scanLength, setScanLength, isUnlocked, onUnlockClick, isLoggedIn, username, onLoginClick, onLogout }) => (
  <div className="animate-[fadeIn_0.5s_ease]">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-2">
      {MODES.map(o => {
        return (
          <button key={o.id} onClick={() => setMode(o.id)} className={`w-full glass-button rounded-xl p-6 cursor-pointer text-center flex flex-col items-center justify-start gap-2 group hover:-translate-y-1 transition-all border ${o.borderClass} ${o.shadowClass}`}>
            <span className="text-3xl mb-2 opacity-80 group-hover:opacity-100 transition-opacity">{o.icon}</span>
            <div className={`text-[15px] font-semibold mb-1 transition-colors text-slate-200 ${o.textClass}`}>
              {o.label}
            </div>
            <div className="text-[12px] text-slate-400 leading-relaxed max-w-[180px]">{o.desc}</div>
          </button>
        );
      })}
    </div>

    <div className="mb-8 p-5 bg-[#111827] border border-[#1E293B] rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span>⚙️</span> Autonomous Scan Length
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Scroll or drag to adjust</span>
      </div>
      <DragNumberInput value={scanLength} onChange={setScanLength} min={1} max={isUnlocked ? 100 : 10} />
      {!isUnlocked && <button onClick={onUnlockClick} className="block w-full text-right text-[10px] text-[#B8860B] mt-2 font-mono uppercase tracking-widest hover:underline cursor-pointer bg-transparent border-none p-0 transition-all">🔒 Locked: Max 10 (Click to Unlock)</button>}
    </div>

    <div className="mt-6 bg-[#111827] border border-[#1E293B] rounded-xl p-6 text-left shadow-lg">
      <h3 className="text-[#B8860B] font-mono uppercase tracking-widest text-sm mb-3">FAQ: Sourcing & Accuracy</h3>
      <p className="text-slate-300 text-[13px] leading-relaxed mb-4">
        <strong>What is the Chicago Booth Protocol?</strong><br/>
        This system follows the methodology outlined in the University of Chicago paper <a href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4835311" target="_blank" rel="noreferrer" className="text-green-500 hover:underline">Financial Statement Analysis with Large Language Models</a> (Kim, Muhn & Nikolaev, 2024). It performs Chain-of-Thought reasoning to disaggregate ROE (DuPont analysis), evaluate growth constraints, and predict earnings direction.
      </p>
      <p className="text-slate-300 text-[13px] leading-relaxed">
        <strong>How accurate is the web search sourcing?</strong><br/>
        The AI is excellent at fetching recent data via its autonomous Google Search capability. However, it can occasionally extract the wrong margin percentage or pull from a generic news summary instead of the raw 10-Q SEC filing. <br/><br/>
        <strong>Solution:</strong> The <em>Targeted Analysis</em> mode includes a <strong>Manual Document Upload</strong> feature. Dragging an exact PDF (like a 10-K or Earnings Transcript) forces the AI to execute its analytical engine against your verified filings, completely eliminating the risk of search errors.
      </p>
    </div>

    <div className="mt-4 p-4 px-5 bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-md text-xs text-slate-400 leading-relaxed text-center">
      <strong className="text-[#B8860B]">Disclaimer:</strong> Educational and research purposes only. Not financial advice.
    </div>
  </div>
);

const LiveScanTable = ({ data }) => (
  <div className="print:hidden animate-[fadeIn_0.5s_ease] mt-8 mb-6 max-w-xl mx-auto bg-[#0A0E17]/80 border border-[#B8860B]/30 rounded-lg overflow-hidden backdrop-blur-sm relative shadow-2xl shadow-black">
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#B8860B]/50 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
    <div className="bg-[#B8860B]/10 px-4 py-3 border-b border-[#B8860B]/20 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8860B] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8860B]"></span>
        </span>
        <span className="text-xs font-mono text-[#B8860B] uppercase tracking-widest font-bold">Live Scan Feed</span>
      </div>
      <span className="text-[10px] font-mono text-[#B8860B]/50 uppercase tracking-widest">Global Top 50 Syncing...</span>
    </div>
    
    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
      {data.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 font-mono italic">Waiting for initial target data...</div>
      ) : (
        <div className="divide-y divide-[#1E293B]">
          {data.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-2 px-4 items-center text-sm font-mono animate-[slideIn_0.3s_ease]">
              <div className="w-4 text-slate-500 text-[10px] text-right">{idx + 1}.</div>
              <div className="font-bold text-slate-200">{item.ticker}</div>
              <div className={`font-bold ${item.score >= 70 ? 'text-[#B8860B]' : (item.score >= 55 ? 'text-slate-300' : 'text-slate-500')}`}>
                {item.score}<span className="text-[10px] text-slate-600 font-normal">/90</span>
              </div>
              <div className="w-24 text-center scale-75 origin-right"><Badge v={item.verdict} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const LeaderboardDisplay = ({ data, onSelect }) => {
  const [expanded, setExpanded] = useState({});
  
  const toggleExpand = (e, ticker) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  return (
    <div className="print:hidden animate-[fadeIn_0.6s_ease] mt-12 mb-8">
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-200 m-0"><span>🌎</span> Global Leaderboard</h3>
          <p className="text-xs text-[#B8860B]/70 mt-1 font-mono tracking-tight">Scores represent a rolling median of the last 10 community analyses.</p>
        </div>
      </div>
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden shadow-lg shadow-black/50">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-3 px-5 border-b border-[#1E293B] text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-900/80 hidden sm:grid">
          <div className="w-6 text-center">#</div>
          <div>Asset</div>
          <div className="text-right w-20">Score</div>
          <div className="text-center w-28">Verdict</div>
          <div className="text-right w-20">Price</div>
        </div>
        <div className="divide-y divide-[#1E293B]">
          {data.length === 0 && <div className="p-8 text-center text-sm text-slate-500 font-mono">No analyses saved yet. Run a scan to populate the global leaderboard!</div>}
          {data.map((item, idx) => (
            <div key={`${item.ticker}-${item.score}`} className="flex flex-col group transition-colors hover:bg-slate-800/80 cursor-pointer">
              <div onClick={() => onSelect(item)} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-3 px-5 items-center">
                <div className={`w-6 text-center font-mono text-sm font-bold ${idx < 3 ? 'text-[#B8860B]' : 'text-slate-500 group-hover:text-slate-300'}`}>{idx + 1}</div>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-slate-200 truncate flex items-center gap-2">
                    {item.ticker}
                    {idx === 0 && <span className="text-[10px] bg-[#B8860B]/20 text-[#B8860B] px-1.5 py-0.5 rounded leading-none shrink-0 border border-[#B8860B]/30">#1</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{item.company}</span>
                    {item.username && <span className="text-[#B8860B]/60 font-mono tracking-tight group-hover:text-[#B8860B] transition-colors border-l border-[#1E293B] pl-2">👤 {item.username}</span>}
                    {item.recentScores?.length > 0 && (
                      <button onClick={(e) => toggleExpand(e, item.ticker)} className="ml-auto text-[#B8860B]/60 hover:text-[#B8860B] px-2 py-0.5 rounded border border-[#1E293B] bg-slate-900 overflow-hidden shrink-0 flex items-center gap-1 transition-colors z-10">
                        📊 <span className="text-[9px] uppercase tracking-widest">{expanded[item.ticker] ? 'HIDE HISTORY' : 'VIEW HISTORY'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-right w-20 font-mono text-[#B8860B] font-bold text-base">{item.score}<span className="text-[10px] text-slate-600">/90</span></div>
                <div className="hidden sm:block text-center w-28 scale-[0.8] origin-center"><Badge v={item.verdict} /></div>
                <div className="hidden sm:block text-right w-20 font-mono text-sm text-slate-300">{item.price}</div>
              </div>
              
              {expanded[item.ticker] && item.recentScores && (
                <div className="px-5 pb-4 pt-1 border-t border-slate-700/50 bg-[#0A0E17]/50 pointer-events-none cursor-default">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Recent calculation history (n={item.recentScores.length})</span>
                    <span className="text-[#B8860B]">Running Median: {item.score}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.recentScores.map((s, i) => (
                      <div key={i} className={`px-2 py-1 rounded text-xs font-mono font-bold border ${Math.abs(s - item.score) <= 2 ? 'bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/20 pointer-events-auto' : 'bg-slate-800 text-slate-400 border-slate-700 pointer-events-auto'}`}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WatchlistGrid = ({ watchlist, onSelect }) => (
  <div className="print:hidden animate-[fadeIn_0.6s_ease] mt-10">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200"><span>⭐</span> Pinned Watchlist</h3>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
      {watchlist.map(item => (
        <div key={item.ticker} onClick={() => onSelect(item)} className="glass-button rounded-xl p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-gold/10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-lg font-mono font-bold text-[#B8860B]">{item.ticker}</span>
            {item.verdict && <div className="scale-75 origin-top-right"><Badge v={item.verdict} /></div>}
          </div>
          <div className="text-[13px] text-slate-400 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.company}</div>
          <div className="flex justify-between text-xs font-mono text-slate-500">
            <span>{item.price}</span>
            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnalysisForm = ({ mode, ticker, setTicker, onRun, onBack, inputRef, marketCapFilter, setMarketCapFilter, files, setFiles, isUnlocked, assetType, setAssetType, etfDepth, setEtfDepth, customEtfCount, setCustomEtfCount, onUnlockClick }) => {
  const activeMode = MODES.find(m => m.id === mode);
  const isTargeted = mode === "analyze" || mode === "earnings" || mode === "predict";
  const isValid = !isTargeted || ticker.trim().length > 0;
  
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf" || f.type.startsWith("text/"));
    processFiles(droppedFiles);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };
  
  const processFiles = (newFiles) => {
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        setFiles(prev => [...prev, { name: file.name, type: file.type, size: file.size, base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease]">
      <button onClick={onBack} className="bg-transparent border-none text-slate-500 hover:text-slate-300 cursor-pointer text-[13px] font-mono p-0 mb-6 transition-colors group flex items-center gap-2"><span className="group-hover:-translate-x-1 transition-transform">←</span> Back</button>
      <div className="glass-panel rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,0.08),transparent)] pointer-events-none" />
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <span className="text-2xl">{activeMode?.icon}</span>
          <h2 className="m-0 text-xl font-semibold text-slate-200">{activeMode?.label}</h2>
        </div>
        
        {isTargeted ? (
          <>
            <div className="mb-6 relative z-10">
              <label className="block text-xs text-slate-400 font-mono uppercase tracking-widest mb-2">Ticker Symbol</label>
              <input ref={inputRef} type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.]/g, ""))} onKeyDown={e => { if (e.key === "Enter" && isValid) onRun(); }} placeholder="e.g. AAPL, INTC, SPY" maxLength={6} className="w-full p-4 px-5 text-xl font-mono font-semibold bg-brand-dark/50 border border-brand-border focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-xl text-brand-gold outline-none tracking-widest transition-all shadow-inner" />
              <div className="mt-2 text-[11px] text-green-500 font-mono">● Real-time Finnhub quote will anchor the analysis</div>
              {mode === "predict" && (
                <button 
                  onClick={() => { setTicker("AUTO"); onRun("predict", "AUTO"); }}
                  className="mt-4 w-full py-3 bg-[#B8860B]/10 border border-[#B8860B]/30 text-[#B8860B] rounded-xl font-mono text-sm tracking-widest uppercase hover:bg-[#B8860B]/20 transition-colors cursor-pointer text-center"
                >
                  ☘️ Auto-Find Swing Trade
                </button>
              )}
            </div>
            <div className="mb-6 relative z-10 flex gap-4">
              <button onClick={() => setAssetType("stock")} className={`flex-1 py-3 rounded-xl font-mono text-sm tracking-widest uppercase font-bold transition-all duration-300 cursor-pointer ${assetType === "stock" ? "bg-[#B8860B] text-[#0A0E17] shadow-[0_0_15px_rgba(212,160,23,0.3)]" : "bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200"}`}>Single Stock</button>
              <button onClick={() => setAssetType("etf")} className={`flex-1 py-3 rounded-xl font-mono text-sm tracking-widest uppercase font-bold transition-all duration-300 cursor-pointer ${assetType === "etf" ? "bg-[#B8860B] text-[#0A0E17] shadow-[0_0_15px_rgba(212,160,23,0.3)]" : "bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200"}`}>ETF (Fund)</button>
            </div>

            {assetType === "etf" && (
              <div className="mb-8 relative z-10 p-5 bg-[#111827] border border-[#1E293B] rounded-xl shadow-inner">
                <label className="block text-xs text-slate-400 font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>Valuation Depth</span>
                  {!isUnlocked && <button onClick={onUnlockClick} className="text-[9px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30 cursor-pointer transition-colors shadow-sm">LOCKED 🔒</button>}
                  {isUnlocked && <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/30">UNLOCKED 🔓</span>}
                </label>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setEtfDepth("lite")} className={`p-3 rounded-lg text-left border cursor-pointer transition-colors ${etfDepth === "lite" ? "bg-[#B8860B]/10 border-[#B8860B] text-[#B8860B]" : "bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-600"}`}>
                    <div className="font-bold text-sm mb-1">Lite Mode</div>
                    <div className="text-[10px] text-slate-500 font-mono">Top 70% Weight / Max 20</div>
                  </button>
                  <button onClick={() => isUnlocked && setEtfDepth("deep")} className={`p-3 rounded-lg text-left border transition-colors ${!isUnlocked ? "opacity-50 cursor-not-allowed bg-[#0A0E17] border-[#1E293B]" : etfDepth === "deep" ? "bg-[#B8860B]/10 border-[#B8860B] text-[#B8860B] cursor-pointer" : "bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-600 cursor-pointer"}`}>
                    <div className="font-bold text-sm mb-1">Deep Analysis</div>
                    <div className="text-[10px] text-slate-500 font-mono">Top 90% Weight</div>
                  </button>
                  <button onClick={() => isUnlocked && setEtfDepth("exhaustive")} className={`p-3 rounded-lg text-left border transition-colors ${!isUnlocked ? "opacity-50 cursor-not-allowed bg-[#0A0E17] border-[#1E293B]" : etfDepth === "exhaustive" ? "bg-[#B8860B]/10 border-[#B8860B] text-[#B8860B] cursor-pointer" : "bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-600 cursor-pointer"}`}>
                    <div className="font-bold text-sm mb-1">Exhaustive</div>
                    <div className="text-[10px] text-slate-500 font-mono">100% of Holdings</div>
                  </button>
                  <button onClick={() => isUnlocked && setEtfDepth("custom")} className={`p-3 rounded-lg text-left border transition-colors flex flex-col justify-center ${!isUnlocked ? "opacity-50 cursor-not-allowed bg-[#0A0E17] border-[#1E293B]" : etfDepth === "custom" ? "bg-[#B8860B]/10 border-[#B8860B] text-[#B8860B] cursor-pointer" : "bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-600 cursor-pointer"}`}>
                    <div className="font-bold text-sm mb-1">Custom Top N</div>
                    <div className="text-[10px] text-slate-500 font-mono">Specify exact count</div>
                  </button>
                </div>
                
                {etfDepth === "custom" && isUnlocked && (
                  <div className="mt-3 flex items-center justify-between border-t border-[#1E293B] pt-4">
                    <label className="text-xs font-mono text-slate-400">Number of Holdings:</label>
                    <input type="number" min="1" max="500" value={customEtfCount} onChange={(e) => setCustomEtfCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 bg-brand-dark/50 border border-brand-border focus:border-brand-gold rounded px-3 py-1.5 text-brand-gold font-mono text-center outline-none" />
                  </div>
                )}
              </div>
            )}
            
            {assetType === "stock" && (
              <div className="mb-8 relative z-10">
                <label className="block text-xs text-slate-400 font-mono uppercase tracking-widest mb-2 flex justify-between">
                  <span>Provide Documents (Optional)</span>
                  <span className="text-[#B8860B] lowercase">SEC filings or Earnings</span>
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#B8860B]', 'bg-[#B8860B]/5'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-[#B8860B]', 'bg-[#B8860B]/5'); }}
                  onDrop={(e) => { e.currentTarget.classList.remove('border-[#B8860B]', 'bg-[#B8860B]/5'); handleDrop(e); }}
                  className="border-2 border-dashed border-[#1E293B] rounded-xl p-6 text-center transition-colors relative hover:border-slate-500"
                >
                  <input type="file" multiple accept="application/pdf,text/plain,text/csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="text-3xl mb-2 opacity-50">📄</div>
                  <div className="text-sm text-slate-300 font-medium mb-1">Drag & Drop PDFs here</div>
                  <div className="text-xs text-slate-500">or click to browse from your computer</div>
                </div>
                
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex justify-between items-center p-3 pr-4 bg-[#111827] border border-[#1E293B] rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xl">📋</span>
                          <div className="truncate">
                            <div className="text-sm font-mono text-slate-200 truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{(f.size/1024/1024).toFixed(2)} MB</div>
                          </div>
                        </div>
                        <button onClick={() => removeFile(i)} className="bg-transparent border-none text-slate-500 hover:text-red-500 cursor-pointer text-lg p-1 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mb-6 relative z-10">
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {mode === "scan" && "The system will autonomously search and review tickers attempting to find a strong buy candidate. It won't always find one in the time allotted, so feel free to try again!"}
              {mode === "adr" && "Scanning for an international ADR at significant discounts to peers or historical multiples."}
              {mode === "sector" && "Finding the highest-quality company in the most out-of-favor sector."}
            </p>
            <label className="block text-xs text-slate-400 font-mono uppercase tracking-widest mb-3">Market Cap Filter</label>
            <div className="flex flex-wrap gap-2">
              {["Any", "Micro", "Small", "Mid", "Large", "Mega"].map(mc => (
                <button
                  key={mc}
                  onClick={() => setMarketCapFilter(mc)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${marketCapFilter === mc ? 'bg-[#B8860B]/15 border-[#B8860B] text-[#B8860B]' : 'bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-500'}`}
                >
                  {mc}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <button onClick={isValid ? () => onRun() : undefined} disabled={!isValid} className={`w-full py-4 px-6 text-[15px] font-semibold rounded-xl border-none tracking-wide transition-all duration-300 shadow-lg relative z-10 ${isValid ? "bg-gradient-to-r from-brand-gold to-[#B8860B] text-brand-dark cursor-pointer hover:opacity-90 hover:shadow-brand-gold/20 hover:-translate-y-0.5" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>
          Run Analysis
        </button>
      </div>
    </div>
  );
};

const LoadingState = ({ message, isAutonomous, scanLength = 1 }) => {
  const maxMins = Math.max(1, Math.ceil(scanLength * 1.5));
  return (
    <div className="animate-[fadeIn_0.4s_ease] text-center pt-20">
      <div className="relative w-16 h-16 mx-auto mb-7">
        <div className="absolute inset-0 border-2 border-[#1E293B] border-t-[#B8860B] rounded-full animate-[spin_1s_linear_infinite]" />
        <div className="absolute inset-2 border-2 border-[#1E293B] border-b-amber-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
      </div>
      <div className="font-mono text-[13px] text-slate-400 whitespace-pre-line leading-loose text-center max-w-xl mx-auto">
        <span className="inline-block w-2 h-2 rounded-full bg-[#B8860B] mr-2.5 animate-[pulse_1.5s_ease-in-out_infinite]" />{message}
      </div>
      <div className="mt-6 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        {isAutonomous && message.includes("predict")
          ? `Autonomous scanning reviews catalysts and binary events to find a high conviction setup. Based on a queue of ${scanLength}, this deep search may take up to ${maxMins} minutes...`
          : isAutonomous 
          ? `Autonomous scanning reviews multiple candidates to find a true value play. Based on a queue of ${scanLength}, this deep search may take up to ${maxMins} minutes...` 
          : "Extracting Finnhub data & generating fundamental analysis... This may take 30-60 seconds."}
      </div>
    </div>
  );
};

const AnalysisResults = ({ parsed, lq, rawResult, currentTicker, isSaved, toggleWatchlist, live, useFinnhub, mode }) => {
  const h = parseKV(parsed.HEADER);
  const sc = parseScores(parsed.SCORES);
  const fv = parseFV(parsed.FAIR_VALUE);
  
  const isPredict = mode === "predict";
  const qn = (sc.EARNINGS_QUALITY||0) + (sc.BALANCE_SHEET||0) + (sc.CASH_FLOW||0) + (sc.VALUATION||0) + (sc.CAPITAL_ALLOCATION||0);
  const ql = (sc.COMPETITIVE_MOAT||0) + (sc.MANAGEMENT||0) + (sc.CATALYST||0) + (sc.RISK_PROFILE||0);
  const tot = qn + ql;
  
  const price = lq ? `$${lq.price.toFixed(2)}` : h.CURRENT_PRICE;
  const currentNum = lq ? lq.price : (h.CURRENT_PRICE ? parseFloat(h.CURRENT_PRICE.replace(/[^0-9.]/g, '')) : null);

  const qi = [];
  if (lq) {
    qi.push({l:"Open",v:`$${(lq.open||0).toFixed(2)}`},{l:"High",v:`$${(lq.high||0).toFixed(2)}`},{l:"Low",v:`$${(lq.low||0).toFixed(2)}`},{l:"Prev Close",v:`$${(lq.prevClose||0).toFixed(2)}`});
    if (lq.wk52High) qi.push({l:"52W Hi",v:`$${lq.wk52High.toFixed(2)}`});
    if (lq.wk52Low) qi.push({l:"52W Lo",v:`$${lq.wk52Low.toFixed(2)}`});
    if (lq.pe) qi.push({l:"P/E",v:lq.pe.toFixed(1)});
    if (lq.pb) qi.push({l:"P/B",v:lq.pb.toFixed(2)});
    if (lq.divYield) qi.push({l:"Div Yld",v:`${lq.divYield.toFixed(2)}%`});
  }

  return (
    <div className="animate-[fadeIn_0.5s_ease]">
      {/* Header Card */}
      <div className="glass-panel bg-gradient-to-br from-brand-panel to-brand-panelHover rounded-2xl p-7 px-8 mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,0.06),transparent)] pointer-events-none" />
        <div className="flex justify-between items-start flex-wrap gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-3xl font-mono font-bold text-[#B8860B]">{h.TICKER || currentTicker || "N/A"}</span>
              {parsed.VERDICT && !isPredict && <Badge v={parsed.VERDICT} />}
              {currentTicker && (
                <button className="print:hidden bg-transparent border-none cursor-pointer text-2xl px-1 hover:scale-110 transition-transform duration-200" style={{ opacity: isSaved ? 1 : 0.4 }} onClick={toggleWatchlist} title={isSaved ? "Remove from Watchlist" : "Save to Watchlist"}>
                  {isSaved ? "⭐" : "☆"}
                </button>
              )}
            </div>
            <div className="text-base font-medium text-slate-200 mb-1">{lq?.company || h.COMPANY || ""}</div>
            <div className="text-xs font-mono text-slate-400">
              {[lq?.sector || h.SECTOR, h.ROBINHOOD ? `RH: ${h.ROBINHOOD}` : null].filter(Boolean).join(" • ")}
            </div>
          </div>
          <div className="text-right">
            <div className="print:hidden mb-3">
              <button onClick={() => window.print()} className="bg-[#B8860B]/10 hover:bg-[#B8860B]/20 border border-[#B8860B] text-[#B8860B] px-3 py-1.5 rounded cursor-pointer text-xs font-mono inline-flex items-center gap-1.5 transition-colors">📄 Export PDF</button>
            </div>
            {price && <div className="text-3xl font-mono font-bold text-slate-200">{price}</div>}
            {live && (
              <div className="mt-1">
                <span className={`font-mono text-sm font-semibold ${(lq.change||0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(lq.change||0) >= 0 ? "+" : ""}{(lq.change||0).toFixed(2)} ({(lq.changePct||0) >= 0 ? "+" : ""}{(lq.changePct||0).toFixed(2)}%)
                </span>
              </div>
            )}
            <div className={`text-[10px] font-mono mt-1 ${live ? 'text-green-500' : 'text-red-500'}`}>
              {live ? "✓ FINNHUB LIVE API" : (useFinnhub ? "⚠ FINNHUB FETCH FAILED - WEB SEARCH" : "PRICE VIA WEB SEARCH")}
            </div>
          </div>
        </div>
      </div>

      {/* Quantitative & Qualitative Scores */}
      {Object.keys(sc).length > 0 && !isPredict && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3.5">Quantitative</div>
            <ScoreBar label="Earnings Quality" score={sc.EARNINGS_QUALITY} />
            <ScoreBar label="Balance Sheet" score={sc.BALANCE_SHEET} />
            <ScoreBar label="Cash Flow" score={sc.CASH_FLOW} />
            <ScoreBar label="Valuation" score={sc.VALUATION} />
            <ScoreBar label="Capital Alloc" score={sc.CAPITAL_ALLOCATION} />
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-sm font-bold"><span className="text-slate-400">TOTAL</span><span className="text-[#B8860B]">{qn}/50</span></div>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3.5">Qualitative</div>
            <ScoreBar label="Comp. Moat" score={sc.COMPETITIVE_MOAT} />
            <ScoreBar label="Management" score={sc.MANAGEMENT} />
            <ScoreBar label="Catalyst" score={sc.CATALYST} />
            <ScoreBar label="Risk (10=low)" score={sc.RISK_PROFILE} />
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-sm font-bold"><span className="text-slate-400">TOTAL</span><span className="text-[#B8860B]">{ql}/40</span></div>
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-base font-bold text-slate-200"><span className="text-slate-200">COMPOSITE</span><span className="text-[#B8860B]">{tot}/90</span></div>
          </div>
        </div>
      )}

      {/* Fair Value Section */}
      {Object.keys(fv).length > 0 && !isPredict && (
        <div className="mb-5">
          <div className="grid grid-cols-3 gap-3 mb-[-12px] relative z-10 mx-4">
            {["BEAR","BASE","BULL"].map(k => (
              <div key={k} className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 text-center shadow-lg">
                <div className={`text-[10px] font-mono uppercase tracking-[0.12em] mb-2 ${k==="BEAR" ? "text-red-500" : k==="BULL" ? "text-green-500" : "text-amber-500"}`}>{k} Case</div>
                <div className="text-sm font-mono font-semibold text-slate-200">{fv[k]||"—"}</div>
              </div>
            ))}
          </div>
          <FairValueVisualizer current={currentNum} fv={fv} quote={lq} />
        </div>
      )}

      {/* Live Metrics (Standard Mode) */}
      {live && lq && !isPredict && (
        <Section title="Finnhub Live Metrics" icon="📡">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4">
            <MetricBox label="52W High" value={lq.wk52High && lq.wk52High < 10000 ? `$${lq.wk52High.toFixed(2)}` : '—'} />
            <MetricBox label="52W Low" value={lq.wk52Low && lq.wk52Low < 10000 ? `$${lq.wk52Low.toFixed(2)}` : '—'} />
            <MetricBox label="P/E Ratio" value={lq.pe ? lq.pe.toFixed(2) : '—'} />
            <MetricBox label="P/B Ratio" value={lq.pb ? lq.pb.toFixed(2) : '—'} />
            <MetricBox label="Div Yield" value={lq.divYield ? `${lq.divYield.toFixed(2)}%` : '—'} />
            <MetricBox label="Market Cap" value={lq.marketCap || h.MARKET_CAP || '—'} />
          </div>
        </Section>
      )}

      {/* Prediction Mode Results */}
      {parsed.CALL_SUMMARY && (
        <div className="bg-[#111827] border-2 border-[#B8860B]/50 rounded-lg p-6 px-7 mb-5 print:break-inside-avoid shadow-[0_0_20px_rgba(184,134,11,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(184,134,11,0.2),transparent)] pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10"><h3 className="m-0 text-[16px] font-mono text-[#B8860B] uppercase tracking-widest font-bold">Call Summary</h3></div>
          <div className="text-[14px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap relative z-10 p-4 bg-[#0A0E17]/50 rounded-md border border-[#1E293B]">{parsed.CALL_SUMMARY}</div>
        </div>
      )}

      {parsed.CONDITIONAL_SCENARIOS && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 mb-5 print:break-inside-avoid shadow-sm">
          <div className="flex items-center gap-2.5 mb-4"><span className="text-xl">🛤️</span><h3 className="m-0 text-[14px] font-mono text-slate-300 uppercase tracking-widest font-semibold">Conditional Scenarios</h3></div>
          <div className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap">{parsed.CONDITIONAL_SCENARIOS}</div>
        </div>
      )}

      {/* Text Sections */}
      {parsed.THESIS && <Section title="Investment Thesis" icon="💡"><div className="border-l-4 border-[#B8860B] pl-4 italic text-slate-300 tracking-wide leading-relaxed">{parsed.THESIS}</div></Section>}
      {parsed.SCREENING_RATIONALE && <Section title="Why This Name Surfaced" icon="🎯">{parsed.SCREENING_RATIONALE}</Section>}
      {parsed.EARNINGS_FORECAST && <Section title="Future Earnings Forecast" icon="🔮">{parsed.EARNINGS_FORECAST}</Section>}
      {parsed.INCOME_STATEMENT && <Section title="Income Statement (DuPont Analysis)" icon="📊">{parsed.INCOME_STATEMENT}</Section>}
      {parsed.BALANCE_SHEET && <Section title="Balance Sheet" icon="🏦">{parsed.BALANCE_SHEET}</Section>}
      {parsed.CASH_FLOW && <Section title="Cash Flow" icon="💰">{parsed.CASH_FLOW}</Section>}
      {parsed.VALUATION && <Section title="Valuation" icon="⚖️">{parsed.VALUATION}</Section>}
      {parsed.QUALITATIVE && <Section title="Qualitative" icon="🔬">{parsed.QUALITATIVE}</Section>}

      {/* Live Metrics (Predict Mode Tertiary Data) */}
      {live && lq && isPredict && (
        <Section title="Finnhub Live Metrics" icon="📡">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4 opacity-75">
            <MetricBox label="52W High" value={lq.wk52High && lq.wk52High < 10000 ? `$${lq.wk52High.toFixed(2)}` : '—'} />
            <MetricBox label="52W Low" value={lq.wk52Low && lq.wk52Low < 10000 ? `$${lq.wk52Low.toFixed(2)}` : '—'} />
            <MetricBox label="P/E Ratio" value={lq.pe ? lq.pe.toFixed(2) : '—'} />
            <MetricBox label="P/B Ratio" value={lq.pb ? lq.pb.toFixed(2) : '—'} />
            <MetricBox label="Div Yield" value={lq.divYield ? `${lq.divYield.toFixed(2)}%` : '—'} />
            <MetricBox label="Market Cap" value={lq.marketCap || h.MARKET_CAP || '—'} />
          </div>
        </Section>
      )}

      {/* Risks & Catalysts Split */}
      {(parsed.CATALYSTS || parsed.RISKS || parsed.KEY_RISKS) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {parsed.CATALYSTS && (
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5"><span className="text-base">🚀</span><h3 className="m-0 text-[13px] font-mono text-green-500 uppercase tracking-widest font-semibold">Catalysts</h3></div>
              <div className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap">{parsed.CATALYSTS}</div>
            </div>
          )}
          {(parsed.RISKS || parsed.KEY_RISKS) && (
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5"><span className="text-base">⚠️</span><h3 className="m-0 text-[13px] font-mono text-red-500 uppercase tracking-widest font-semibold">Risks</h3></div>
              <div className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap">{parsed.RISKS || parsed.KEY_RISKS}</div>
            </div>
          )}
        </div>
      )}

      {parsed.VALUE_TRAP_CHECK && <Section title="Value Trap Check" icon="🪤">{parsed.VALUE_TRAP_CHECK}</Section>}
      {parsed.MONITORING && <Section title="Monitoring Triggers" icon="👁️">{parsed.MONITORING}</Section>}
      {parsed.POSITION_SIZING && <Section title="Position Sizing" icon="📐">{parsed.POSITION_SIZING}</Section>}
      {parsed.SOURCES && (
        <div className="glass-panel p-6 mb-5 rounded-2xl print:break-inside-avoid bg-slate-900/40">
          <div className="flex items-center gap-2.5 mb-3.5"><span className="text-base">🔗</span><h3 className="m-0 text-[13px] font-mono text-slate-400 uppercase tracking-widest font-semibold">Sources Used</h3></div>
          <div className="text-[13px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">{renderLinks(parsed.SOURCES)}</div>
        </div>
      )}

      <details className="print:hidden mt-4 group">
        <summary className="cursor-pointer text-xs font-mono text-slate-500 py-2 hover:text-slate-300 transition-colors">View Raw Output</summary>
        <pre className="mt-2 bg-[#111827] border border-[#1E293B] rounded-lg p-5 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400 max-h-[400px] overflow-auto">{rawResult}</pre>
      </details>

      <div className="print:hidden mt-6 p-3.5 px-5 bg-[#B8860B]/10 rounded-md border border-[#B8860B]/20 text-[11px] text-slate-500 leading-relaxed text-center">
        Educational and research purposes only. Not financial advice.{live && " Price data via Finnhub."}
      </div>
    </div>
  );
};


const QUICK_PROMPTS = [
  { id: "10q", icon: "📄", label: "Find 10-Q SEC Filing", prefix: "Can you find the latest SEC 10-Q filing link for " },
  { id: "etf", icon: "📊", label: "Yahoo ETF Holdings", prefix: "Find the direct link to the Yahoo Finance holdings page for the ETF " },
  { id: "earn", icon: "🎙️", label: "Earnings Transcript", prefix: "What are the most recent earnings transcript highlights for " },
  { id: "eval", icon: "🎓", label: "Explain Protocol", prefix: "Summarize the Chicago Booth valuation methodology used in this app.", instant: true }
];

// ─── AI CHAT COMPONENT ───
const ChatBubble = ({ geminiKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activePrompt, setActivePrompt] = useState(null);
  const messagesEndRef = useRef(null);

  const renderMessageText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, lineIndex, arr) => {
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <a key={`link-${lineIndex}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-[#B8860B] hover:text-[#B8860B] font-semibold underline underline-offset-4 break-none transition-colors">
            {match[1]}
          </a>
        );
        lastIndex = linkRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      return (
        <span key={`line-${lineIndex}`}>
          {parts}
          {lineIndex < arr.length - 1 && <br />}
        </span>
      );
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const processQuery = async (queryText) => {
    if (!geminiKey && RUNTIME_API_KEY === "") {
      setMessages(prev => [...prev, { role: "assistant", text: "Please enter your Gemini API Key in the top right to use the chat." }]);
      return;
    }
    const activeGeminiKey = geminiKey ? geminiKey.trim() : RUNTIME_API_KEY;
    const newMessages = [...messages, { role: "user", text: queryText }];
    setMessages(newMessages);
    setIsTyping(true);
    setInput("");
    setActivePrompt(null);

    try {
      const prompt = newMessages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`).join("\n") + "\nUser: " + queryText + "\nAI:";
      const sysPrompt = "You are a helpful AI assistant for the Value Analyst tool. Provide concise, accurate answers, structural analysis insights, or links if asked.";
      const res = await callGemini(prompt, sysPrompt, activeGeminiKey);
      setMessages(prev => [...prev, { role: "assistant", text: res }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Error: " + err.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !activePrompt?.instant) return;
    const fullText = activePrompt ? `${activePrompt.prefix}${input.trim()}` : input.trim();
    if (!fullText) return;
    await processQuery(fullText);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 flex items-center justify-center transition-all cursor-pointer z-[9999] border-none ${isOpen ? 'w-14 h-14 bg-gradient-to-br from-[#B8860B] to-[#B8860B] rounded-full text-2xl shadow-[0_0_20px_rgba(212,160,23,0.3)] text-[#0A0E17] hover:scale-110' : 'w-20 h-20 bg-transparent hover:scale-105'}`}
        style={{ zIndex: 9999 }}
      >
        {isOpen ? "✕" : <img src="/chat-icon.png" alt="Chat AI" className="w-full h-full object-contain mix-blend-screen opacity-80 hover:opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-opacity" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[340px] sm:w-[400px] bg-[#0A0E17] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-[fadeIn_0.2s_ease]">
          <div className="bg-[#111827] border-b border-[#1E293B] p-4 flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 m-0">Gemini Assistant</h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase m-0 mt-0.5">Direct API Query</p>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto h-80 flex flex-col gap-3 custom-scrollbar bg-[#0A0E17]/50">
            {messages.length === 0 && (
              <div className="flex flex-col h-full justify-center opacity-80 transition-opacity hover:opacity-100">
                <div className="text-center text-xs text-slate-400 font-mono italic px-4 leading-relaxed mb-6">
                  Ask Gemini for research links, concepts, or quick analysis...
                </div>
                <div className="flex flex-wrap gap-2 justify-center px-2">
                  {QUICK_PROMPTS.map(p => {
                    const isActive = activePrompt?.id === p.id;
                    if (activePrompt && !isActive) return null; // hide others
                    
                    return (
                      <button 
                        key={p.id}
                        onClick={() => {
                          if (isActive) {
                            setActivePrompt(null);
                          } else {
                            if (p.instant) {
                              processQuery(p.prefix);
                            } else {
                              setActivePrompt(p);
                              setInput("");
                            }
                          }
                        }}
                        className={`text-[10px] font-mono uppercase tracking-wider py-1.5 px-3 rounded-full cursor-pointer transition-all text-left border ${isActive ? 'bg-[#B8860B] text-[#0A0E17] border-[#B8860B] scale-105 shadow-[0_0_10px_rgba(212,160,23,0.4)] font-bold' : 'bg-[#B8860B]/10 hover:bg-[#B8860B]/20 border-[#B8860B]/30 text-[#B8860B]'}`}
                      >
                        {p.icon} {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl p-3 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-[#B8860B]/10 border border-[#B8860B]/20 text-slate-200 self-end rounded-tr-sm' : 'bg-[#111827] border border-[#1E293B] text-slate-300 self-start rounded-tl-sm'}`}>
                {renderMessageText(m.text)}
              </div>
            ))}
            {isTyping && (
              <div className="bg-[#111827] border border-[#1E293B] text-slate-400 rounded-xl p-3 text-[13px] max-w-[85%] self-start rounded-tl-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full animate-bounce delay-150"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-[#111827] border-t border-[#1E293B] flex gap-2 relative">
            {activePrompt && !activePrompt.instant && (
              <div className="absolute -top-6 left-3 bg-[#B8860B] text-[#0A0E17] text-[9px] font-mono font-bold px-2 py-0.5 rounded-t-md flex items-center gap-2 shadow-[0_-4px_10px_rgba(212,160,23,0.15)] z-10">
                {activePrompt.icon} {activePrompt.label}
                <button type="button" onClick={() => setActivePrompt(null)} className="bg-transparent border-none text-[#0A0E17]/60 hover:text-[#0A0E17] cursor-pointer p-0 ml-1">✕</button>
              </div>
            )}
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder={activePrompt ? `Enter ticker for ${activePrompt.label}...` : "Ask anything or click a prompt..."}
              className={`flex-1 bg-[#0A0E17] border focus:border-[#B8860B] rounded-lg px-3 py-2 text-sm outline-none transition-colors relative z-20 ${activePrompt ? 'border-[#B8860B] text-[#B8860B] font-mono font-bold' : 'border-[#1E293B] text-slate-200'}`}
            />
            <button type="submit" disabled={isTyping || (!input.trim() && !activePrompt?.instant)} className="bg-[#B8860B] text-[#0A0E17] rounded-lg px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#B8860B] transition-colors border-none font-bold relative z-20">
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
};

// ─── MAIN APPLICATION COMPONENT ───
export default function App() {
  const [mode, setMode] = useState(null);
  const [ticker, setTicker] = useState("");
  const [marketCapFilter, setMarketCapFilter] = useState("Any");
  const [finnhubKey, setFinnhubKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResult, setRawResult] = useState("");
  const [parsed, setParsed] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [lq, setLq] = useState(null);
  const [unlucky, setUnlucky] = useState(false);
  const [scannedBatch, setScannedBatch] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [sessionFiles, setSessionFiles] = useState([]);
  const [scanLength, setScanLength] = useState(1);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try { return localStorage.getItem("value_analyst_unlocked") === "true"; }
    catch (e) { return false; }
  });
  
  const [etfDepth, setEtfDepth] = useState("lite");
  const [assetType, setAssetType] = useState("stock");
  const [customEtfCount, setCustomEtfCount] = useState(10);
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return localStorage.getItem("value_analyst_logged_in") === "true"; }
    catch (e) { return false; }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem("value_analyst_username") || ""; }
    catch (e) { return ""; }
  });
  
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("value_analyst_watchlist")) || []; }
    catch (e) { return []; }
  });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      
      setIsLoggedIn(true);
      localStorage.setItem("value_analyst_username", data.username);
      localStorage.setItem("value_analyst_logged_in", "true");
      if (data.watchlist) setWatchlist(data.watchlist); // Cloud sync pull
      setShowLoginModal(false);
      setAuthPassword("");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setAuthPassword("");
    setWatchlist([]);
    localStorage.removeItem("value_analyst_username");
    localStorage.removeItem("value_analyst_logged_in");
  };

  const [leaderboard, setLeaderboard] = useState([]);
  const [etfLeaderboard, setEtfLeaderboard] = useState([]);
  const [showEtfs, setShowEtfs] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setLeaderboard(data);
    }).catch(e => console.log("Global leaderboard not connected locally."));

    fetch('/api/etf-leaderboard').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEtfLeaderboard(data);
    }).catch(e => console.log("ETF leaderboard not connected locally."));
  }, []);

  const [useFinnhub, setUseFinnhub] = useState(() => {
    try { return JSON.parse(localStorage.getItem("value_analyst_use_finnhub")) ?? true; }
    catch (e) { return true; }
  });

  // Persistent memory of all evaluated stocks so we force a complete rotation
  const [scanHistory, setScanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("value_analyst_scan_history")) || []; }
    catch (e) { return []; }
  });
  
  const inputRef = useRef(null);

  useEffect(() => { localStorage.setItem("value_analyst_watchlist", JSON.stringify(watchlist)); }, [watchlist]);
  useEffect(() => { localStorage.setItem("value_analyst_username", username); }, [username]);
  useEffect(() => { localStorage.setItem("value_analyst_use_finnhub", JSON.stringify(useFinnhub)); }, [useFinnhub]);
  useEffect(() => { localStorage.setItem("value_analyst_scan_history", JSON.stringify(scanHistory)); }, [scanHistory]);
  useEffect(() => { if (mode && (mode === "analyze" || mode === "earnings") && inputRef.current) inputRef.current.focus(); }, [mode]);

  const fetchKeysWithPin = useCallback(async (pin, isManualSubmit = false) => {
    try {
      if (isManualSubmit) setPinError("");
      
      let unlocked = false;
      if (pin === "2147") {
        setIsUnlocked(true);
        localStorage.setItem("value_analyst_unlocked", "true");
        unlocked = true;
      }

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.geminiKey) setGeminiKey(data.geminiKey);
        if (data.finnhubKey) setFinnhubKey(data.finnhubKey);
        localStorage.setItem("value_analyst_pin", pin);
        if (isManualSubmit) setShowPinModal(false);
      } else {
        if (!unlocked) {
          if (isManualSubmit) setPinError(data.error || "Invalid PIN");
          else localStorage.removeItem("value_analyst_pin");
        } else {
          localStorage.setItem("value_analyst_pin", pin);
          if (isManualSubmit) setShowPinModal(false);
        }
      }
    } catch (e) {
      if (isManualSubmit && pin !== "2147") setPinError("Error connecting to server.");
      else if (isManualSubmit && pin === "2147") setShowPinModal(false);
    }
  }, []);

  useEffect(() => {
    const savedPin = localStorage.getItem("value_analyst_pin");
    if (savedPin) fetchKeysWithPin(savedPin);
  }, [fetchKeysWithPin]);

  const reset = () => { 
    setMode(null); setTicker(""); setMarketCapFilter("Any"); setLoading(false); 
    setError(null); setRawResult(""); setParsed(null); setStreamText(""); 
    setStatusMsg(""); setLq(null); setUnlucky(false); setScannedBatch([]); 
    setSessionFiles([]);
  };

  const run = useCallback(async (overrideMode, overrideTicker) => {
    const activeMode = typeof overrideMode === 'string' ? overrideMode : mode;
    const tkRaw = typeof overrideTicker === 'string' ? overrideTicker : ticker;
    const tk = tkRaw.trim().toUpperCase();

    if (typeof overrideMode === 'string') setMode(overrideMode);
    if (typeof overrideTicker === 'string') setTicker(overrideTicker);

    const isTargeted = activeMode === "analyze" || activeMode === "earnings" || activeMode === "etf" || (activeMode === "predict" && tk !== "AUTO");
    if (isTargeted && !tk) return;

    setLoading(true); setError(null); setRawResult(""); setParsed(null); 
    setStreamText(""); setLq(null); setUnlucky(false); setLiveResults([]);
    
    const activeGeminiKey = geminiKey ? geminiKey.trim() : RUNTIME_API_KEY;
    
    if (!activeGeminiKey) {
      setError("Missing Gemini API Key. Please enter it in the top right corner.");
      setLoading(false);
      return;
    }

    const maxAttempts = isTargeted ? 1 : scanLength; 
    let attempt = 1;
    let sessionExcluded = []; 
    let localBatch = [];
    let localScanHistory = [...scanHistory]; // Take a snapshot for this run
    let finalParsed = null;
    let finalRaw = "";
    let finalLq = null;
    let finalTickerUsed = tk;

    try {
      if (isTargeted && assetType === "etf") {
        setStatusMsg(`Fetching full holdings for ETF ${tk}...\n(Attempting Finnhub, fallback to Gemini Web Search)`);
        const expectedCount = etfDepth === "exhaustive" ? 500 : (etfDepth === "deep" ? 100 : (etfDepth === "custom" ? customEtfCount : 20));
        const holdingsRaw = await fetchETFHoldings(tk, finnhubKey, activeGeminiKey, expectedCount);
        
        let holdings = holdingsRaw.sort((a,b) => (b.percent || 0) - (a.percent || 0));
        
        // Apply Valuation Depth Filter
        if (etfDepth === "custom" && customEtfCount) {
          holdings = holdings.slice(0, customEtfCount);
        } else if (etfDepth !== "exhaustive") {
          const targetWeight = etfDepth === "lite" ? 70 : 90; // "deep" is 90
          const maxCount = etfDepth === "lite" ? 20 : 500;
          
          let currentWeight = 0;
          let keepCount = 0;
          
          for (let i = 0; i < holdings.length; i++) {
            if (currentWeight >= targetWeight || keepCount >= maxCount) break;
            currentWeight += (holdings[i].percent || 0);
            keepCount++;
          }
          holdings = holdings.slice(0, Math.max(1, keepCount));
        }

        // Normalize the weights of the targeted subset so they equal exactly 100% locally
        const subsetOriginalWeight = holdings.reduce((sum, h) => sum + (h.percent || 0), 0);
        
        let cumulativeScore = 0;
        let analyzedCount = 0;
        let etfNotes = "";
        
        for (let i = 0; i < holdings.length; i++) {
          const h = holdings[i];
          const currentTicker = h.symbol;
          if (!currentTicker) continue;
          
          setStatusMsg(`Analyzing holding ${i+1}/${holdings.length} (${currentTicker})...\nAggregating weighted intrinsic value...`);
          
          let ldb = "";
          let liveQuote = null;
          try {
            liveQuote = await fetchFinnhubData(currentTicker, finnhubKey);
            if (liveQuote && liveQuote.price) {
              ldb = `\n\n--- LIVE MARKET DATA ---\nCURRENT PRICE: $${liveQuote.price.toFixed(2)}\nOPEN: $${(liveQuote.open || 0).toFixed(2)}\nHIGH: $${(liveQuote.high || 0).toFixed(2)}\nLOW: $${(liveQuote.low || 0).toFixed(2)}\nPREV CLOSE: $${(liveQuote.prevClose || 0).toFixed(2)}\nCHANGE: ${(liveQuote.change || 0) >= 0 ? "+" : ""}${(liveQuote.change || 0).toFixed(2)} (${(liveQuote.changePct || 0) >= 0 ? "+" : ""}${(liveQuote.changePct || 0).toFixed(2)}%)\n${liveQuote.company ? `COMPANY: ${liveQuote.company}\n` : ''}${liveQuote.sector ? `SECTOR: ${liveQuote.sector}\n` : ''}${liveQuote.marketCap ? `MARKET CAP: ${liveQuote.marketCap}\n` : ''}${liveQuote.pe ? `P/E: ${liveQuote.pe.toFixed(2)}\n` : ''}${liveQuote.pb ? `P/B: ${liveQuote.pb.toFixed(2)}\n` : ''}${liveQuote.divYield ? `DIV YIELD: ${liveQuote.divYield.toFixed(2)}%\n` : ''}${liveQuote.wk52High ? `52W HIGH: $${liveQuote.wk52High.toFixed(2)}\n` : ''}${liveQuote.wk52Low ? `52W LOW: $${liveQuote.wk52Low.toFixed(2)}\n` : ''}\nYOU MUST USE $${liveQuote.price.toFixed(2)} AS CURRENT PRICE AND THE QUANTITATIVE METRICS ABOVE. Do NOT search the web for current pricing.\n--- END LIVE DATA ---`;
            }
          } catch(e) {}

          const baseInstr = `Perform a complete fundamental value analysis on ${currentTicker}. Search the web for qualitative data, earnings history, and news. ${useFinnhub ? "YOU MUST USE THE PROVIDED LIVE MARKET DATA FOR ALL PRICING AND QUANTITATIVE METRICS. DO NOT SEARCH THE WEB FOR CURRENT STOCK PRICE." : ""}`;
          const analysisPromptText = `MODE: analyze\nTICKER: ${currentTicker}\n\n${ldb}\n\n${baseInstr}\n\nOutput in the required structured format. NO PLACEHOLDERS. FILL EVERY FIELD.`;
          
          try {
            const txt = await callGemini(analysisPromptText, SYSTEM_PROMPT, activeGeminiKey, []);
            const p = parseAnalysis(txt);
            const tempSc = parseScores(p.SCORES);
            const trueScore = (tempSc.EARNINGS_QUALITY||0) + (tempSc.BALANCE_SHEET||0) + (tempSc.CASH_FLOW||0) + 
                              (tempSc.VALUATION||0) + (tempSc.CAPITAL_ALLOCATION||0) + (tempSc.COMPETITIVE_MOAT||0) + 
                              (tempSc.MANAGEMENT||0) + (tempSc.CATALYST||0) + (tempSc.RISK_PROFILE||0);
            
            if (trueScore > 0) {
              // Mathematical normalization: holding's physical weight divided by the subset's total weight
              const normalizedWeightMultiplier = (h.percent || 0) / subsetOriginalWeight;
              cumulativeScore += (trueScore * normalizedWeightMultiplier);
              analyzedCount++;
              etfNotes += `${currentTicker}: ${trueScore}/90 (${(normalizedWeightMultiplier * 100).toFixed(2)}% adjusted weight)\n`;

              // Exfiltration of high scores to global leaderboard
              if (trueScore >= 70) {
                let holdingVerdict = "Buy";
                if (trueScore >= 80) holdingVerdict = "Strong Buy";
                
                const newHoldingEntry = {
                  ticker: currentTicker, 
                  company: liveQuote?.company || currentTicker, 
                  score: trueScore, 
                  verdict: holdingVerdict, 
                  price: liveQuote?.price ? `$${liveQuote.price.toFixed(2)}` : 'N/A', 
                  timestamp: Date.now(), 
                  username: username || "Anonymous User"
                };
                
                fetch('/api/leaderboard', {
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify(newHoldingEntry)
                }).then(r => r.json()).then(data => {
                  if (Array.isArray(data)) setLeaderboard(data);
                }).catch(e => console.log("Live upload failed for ETF holding", e));
              }
            }
          } catch(e) {
            console.warn(`Failed to analyze ${currentTicker} for ETF ${tk}`, e);
          }
        }

        if (analyzedCount === 0) throw new Error("Could not successfully evaluate any holdings.");

        const finalScore = Math.round(cumulativeScore);
        let finalVerdict = "Strong Avoid";
        if (finalScore >= 80) finalVerdict = "Strong Buy";
        else if (finalScore >= 70) finalVerdict = "Buy";
        else if (finalScore >= 55) finalVerdict = "Hold";
        else if (finalScore >= 45) finalVerdict = "Avoid";
        
        finalParsed = {
          HEADER: `TICKER: ${tk}\nCOMPANY: ${tk} ETF\nSECTOR: ETF\nMARKET_CAP: N/A\nCURRENT_PRICE: N/A\nROBINHOOD: Yes`,
          SCREENING_RATIONALE: `Aggregated Deep Value Analysis of ${analyzedCount} underlying holdings.`,
          THESIS: `The value of this ETF is derived purely from its weighed constituent fundamentals. The aggregated composite intrinsic value score of the underlying portfolio is ${finalScore}/90.`,
          QUALITATIVE: `Constituent Weights & Scores:\n${etfNotes}`,
          VERDICT: finalVerdict,
          SCORES: `EARNINGS_QUALITY: ${Math.round(finalScore/9)}\nBALANCE_SHEET: ${Math.round(finalScore/9)}\nCASH_FLOW: ${Math.round(finalScore/9)}\nVALUATION: ${Math.round(finalScore/9)}\nCAPITAL_ALLOCATION: ${Math.round(finalScore/9)}\nCOMPETITIVE_MOAT: ${Math.round(finalScore/9)}\nMANAGEMENT: ${Math.round(finalScore/9)}\nCATALYST: ${Math.round(finalScore/9)}\nRISK_PROFILE: ${Math.round(finalScore/9)}`
        };
        finalRaw = `[ETF Composite Analysis generated automatically via constituent weighting]\n\n${etfNotes}`;
        
        setParsed(finalParsed);
        setRawResult(finalRaw);
        
        const newEntry = {
          ticker: tk, company: `${tk} ETF`, score: finalScore, verdict: finalVerdict, price: 'ETF', timestamp: Date.now(), username: username || "Anonymous User"
        };
        fetch('/api/etf-leaderboard', {
           method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEntry)
        }).then(r => r.json()).then(data => {
           if (Array.isArray(data)) setEtfLeaderboard(data);
        }).catch(e => console.log("Live upload failed", e));
        
        setLoading(false);
        setStatusMsg("");
        return;
      }

      while (attempt <= maxAttempts) {
        let currentTicker = tk;
        let currentLq = null;
        let ldb = ""; 

        // --- STEP 1: DISCOVERY PASS (Autonomous Only) ---
        if (!isTargeted) {
          setStatusMsg(`[Scan ${attempt}/${maxAttempts}] Autonomously searching for a candidate...`);
          let validPool = marketCapFilter !== "Any" ? (TICKER_POOLS[marketCapFilter.toUpperCase()] || []) : Object.values(TICKER_POOLS).flat();

          // STRICT ROTATION: Exclude everything we've EVER scanned until the pool is exhausted
          let freshPool = validPool.filter(t => !localScanHistory.includes(t) && !sessionExcluded.includes(t));
          
          if (freshPool.length < 4) {
            // We evaluated every single stock in this market cap bracket!
            // Time to wipe the memory for this specific bracket and start the cycle over.
            localScanHistory = localScanHistory.filter(t => !validPool.includes(t));
            setScanHistory(localScanHistory);
            freshPool = validPool.filter(t => !sessionExcluded.includes(t));
            setStatusMsg(p => p + `\nPool exhausted! Resetting ${marketCapFilter} cycle...`);
          } 

          // True Cryptographic Fisher-Yates shuffle
          for (let i = freshPool.length - 1; i > 0; i--) {
            const j = Math.floor(secureRandom() * (i + 1));
            [freshPool[i], freshPool[j]] = [freshPool[j], freshPool[i]];
          }

          // Shrink the subset to 5 to further reduce the AI's ability to pick a favorite, and shuffle again
          const subsetPool = freshPool.slice(0, 5);
          for (let i = subsetPool.length - 1; i > 0; i--) {
            const j = Math.floor(secureRandom() * (i + 1));
            [subsetPool[i], subsetPool[j]] = [subsetPool[j], subsetPool[i]];
          }
          const capInstruction = ` IMPORTANT: You MUST exclusively select your final ticker from this exact, highly-constrained random subset of stocks: [${subsetPool.join(", ")}]. Pick the single best value play from these exactly. Do not pick ANY stock outside this list.`;

          const discoveryPrompts = {
            scan: `Pick ONE specific, real undervalued U.S. stock.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`,
            adr: `Pick ONE specific international ADR available on US exchanges.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`,
            sector: `Identify an out-of-favor, beaten-down, or actively hated sector, then pick a fundamentally sound company within it from the provided list.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`,
            predict: `Search the web for upcoming earnings calendars or FDA PDUFA calendars for the next 7 days. Identify ONE specific U.S. stock with a confirmed, high-impact binary event. ${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`
          };
          
          const discRes = await callGemini(discoveryPrompts[activeMode], "You are a ticker discovery tool. You must ONLY output the ticker wrapped in <TICKER> tags.", activeGeminiKey);
          
          let matchTicker = null;
          const xmlMatch = discRes.match(/<TICKER>\s*([A-Z.-]+)\s*<\/TICKER>/i);
          if (xmlMatch && xmlMatch[1] && xmlMatch[1].toUpperCase() !== "NONE" && xmlMatch[1].toUpperCase() !== "I") {
            matchTicker = xmlMatch[1];
          } 
          if (!matchTicker) matchTicker = subsetPool.find(t => discRes.includes(t));
          if (!matchTicker) {
            const fallbacks = discRes.match(/\b([A-Z]{2,5})\b/g) || [];
            matchTicker = fallbacks.find(w => !['THE','AND','FOR','NOT','BUT','ANY','ALL','ARE','NONE'].includes(w));
          }
          
          if (matchTicker) {
            currentTicker = matchTicker.toUpperCase();
            
            // Add to persistent memory so it doesn't get picked again in future scans
            localScanHistory = [currentTicker, ...localScanHistory.filter(t => t !== currentTicker)].slice(0, 500);
            setScanHistory(localScanHistory);

            setStatusMsg(p => p + `\n✓ Candidate selected: ${currentTicker}`);
          } else {
            throw new Error(`Could not identify a valid ticker. Gemini replied: ${discRes}`);
          }
        }

        // --- STEP 2: FINNHUB FETCH ---
        if (useFinnhub) {
          setStatusMsg(p => p + `\nFetching live pricing & metrics for ${currentTicker}...`);
          try {
            const d = await fetchFinnhubData(currentTicker, finnhubKey);
            if (d && d.price) {
              currentLq = d;
              ldb = `\n\n--- LIVE MARKET DATA (Finnhub real-time) ---\nCURRENT PRICE: $${d.price.toFixed(2)}\nOPEN: $${(d.open || 0).toFixed(2)}\nHIGH: $${(d.high || 0).toFixed(2)}\nLOW: $${(d.low || 0).toFixed(2)}\nPREV CLOSE: $${(d.prevClose || 0).toFixed(2)}\nCHANGE: ${(d.change || 0) >= 0 ? "+" : ""}${(d.change || 0).toFixed(2)} (${(d.changePct || 0) >= 0 ? "+" : ""}${(d.changePct || 0).toFixed(2)}%)\n${d.company ? `COMPANY: ${d.company}\n` : ''}${d.sector ? `SECTOR: ${d.sector}\n` : ''}${d.marketCap ? `MARKET CAP: ${d.marketCap}\n` : ''}${d.pe ? `P/E: ${d.pe.toFixed(2)}\n` : ''}${d.pb ? `P/B: ${d.pb.toFixed(2)}\n` : ''}${d.divYield ? `DIV YIELD: ${d.divYield.toFixed(2)}%\n` : ''}${d.wk52High ? `52W HIGH: $${d.wk52High.toFixed(2)}\n` : ''}${d.wk52Low ? `52W LOW: $${d.wk52Low.toFixed(2)}\n` : ''}\nYOU MUST USE $${d.price.toFixed(2)} AS CURRENT PRICE AND THE QUANTITATIVE METRICS ABOVE. Do NOT search the web for current pricing.\n--- END LIVE DATA ---`;
            }
          } catch (e) {
            setStatusMsg(p => p + `\n⚠ Finnhub fetch error. Web search will be used.`);
          }
        }

        // --- STEP 3: FULL ANALYSIS ---
        setStatusMsg(p => p + `\nRunning deep fundamental analysis on ${currentTicker}...`);
        const baseInstr = `Perform a complete fundamental value analysis on ${currentTicker}. Search the web for qualitative data, earnings history, and news. ${useFinnhub ? "YOU MUST USE THE PROVIDED LIVE MARKET DATA FOR ALL PRICING AND QUANTITATIVE METRICS. DO NOT SEARCH THE WEB FOR CURRENT STOCK PRICE." : ""}`;
        
        let analysisPromptText = "";
        let finalFiles = [];
        
        if (activeMode === "analyze" || activeMode === "scan" || activeMode === "adr" || activeMode === "sector") {
            const hasFilesInstr = sessionFiles.length > 0 ? "IMPORTANT OVERRIDE: The user has attached actual raw documents. YOU MUST ATTACH HIGHEST WEIGHT TO THE ATTACHED DOCUMENTS OVER WEB SEARCHES FOR FINANCIALS OR EARNINGS DATA." : "";
            analysisPromptText = `MODE: ${activeMode}\nTICKER: ${currentTicker}\n\n${ldb}\n\n${baseInstr}\n\n${hasFilesInstr}\n\nOutput in the required structured format. NO PLACEHOLDERS. FILL EVERY FIELD.`;
            if (isTargeted) finalFiles = sessionFiles;
        } else if (activeMode === "earnings") {
             const hasFilesInstr = sessionFiles.length > 0 ? "IMPORTANT OVERRIDE: Documents attached. USE ATTACHED DOCUMENTS EXPLICITLY OVER WEB SEARCH." : "";
             analysisPromptText = `MODE: earnings\nTICKER: ${currentTicker}\n\n${ldb}\n\nPerform a post-earnings drift analysis on ${currentTicker}. Search for the most recent earnings results vs consensus, stock reaction, forward guidance, and analyst revisions. Predict the direction of next quarter's earnings. ${useFinnhub ? "YOU MUST USE THE PROVIDED LIVE MARKET DATA." : ""}\n\n${hasFilesInstr}\n\nOutput in the required structured format. NO PLACEHOLDERS. FILL EVERY FIELD.`;
             finalFiles = sessionFiles;
        } else if (activeMode === "predict") {
             const hasFilesInstr = sessionFiles.length > 0 ? "IMPORTANT OVERRIDE: Documents attached. USE ATTACHED DOCUMENTS EXPLICITLY OVER WEB SEARCH." : "";
             analysisPromptText = `MODE: predict\nTICKER: ${currentTicker}\n\n${ldb}\n\nExecute the AI Directional Prediction Protocol for ${currentTicker}. ${useFinnhub ? "YOU MUST USE THE PROVIDED LIVE MARKET DATA." : ""}\n\n${hasFilesInstr}\n\nOutput in the EXACT requested structured format with === markers. NO PLACEHOLDERS. FILL EVERY FIELD.`;
             finalFiles = sessionFiles;
        }

        const promptToUse = activeMode === "predict" ? PREDICTION_PROMPT : SYSTEM_PROMPT;
        const txt = await callGemini(analysisPromptText, promptToUse, activeGeminiKey, finalFiles);
        const p = parseAnalysis(txt);
        
        if (Object.keys(p).length > 2) {
          
          const tempSc = parseScores(p.SCORES);
          const trueScore = (tempSc.EARNINGS_QUALITY||0) + (tempSc.BALANCE_SHEET||0) + (tempSc.CASH_FLOW||0) + 
                            (tempSc.VALUATION||0) + (tempSc.CAPITAL_ALLOCATION||0) + (tempSc.COMPETITIVE_MOAT||0) + 
                            (tempSc.MANAGEMENT||0) + (tempSc.CATALYST||0) + (tempSc.RISK_PROFILE||0);
          
          if (trueScore >= 80) p.VERDICT = "Strong Buy";
          else if (trueScore >= 70) p.VERDICT = "Buy";
          else if (trueScore >= 55) p.VERDICT = "Hold";
          else if (trueScore >= 45) p.VERDICT = "Avoid";
          else p.VERDICT = "Strong Avoid";

          finalParsed = p;
          finalRaw = txt;
          finalLq = currentLq;
          finalTickerUsed = currentTicker;

          // --- LEADERBOARD UPDATE (ALL SCANS) ---
          if (trueScore > 0) {
            const h = parseKV(p.HEADER);
            const priceStr = currentLq ? `$${currentLq.price.toFixed(2)}` : h.CURRENT_PRICE;
            const newEntry = {
              ticker: currentTicker,
              company: currentLq?.company || h.COMPANY || currentTicker,
              score: trueScore,
              verdict: p.VERDICT,
              price: priceStr,
              timestamp: Date.now(),
              username: username || "Anonymous User"
            };
            
            // Add to live visual feed
            setLiveResults(prev => [...prev, newEntry]);
            
            // Optimistic update locally
            setLeaderboard(prev => {
              const filtered = prev.filter(item => item.ticker !== currentTicker);
              return [...filtered, newEntry].sort((a, b) => b.score - a.score).slice(0, 50); 
            });

            // Post to Vercel KV global leaderboard
            fetch('/api/leaderboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newEntry)
            }).then(r => r.json()).then(data => {
              if (Array.isArray(data)) setLeaderboard(data);
            }).catch(e => console.log("Live upload failed", e));
          }
          
          if (!isTargeted) {
            localBatch.push({ ticker: currentTicker, score: trueScore, verdict: p.VERDICT });
          }

          if (isTargeted) break;

          if (activeMode === "predict") {
            const sumBlock = p.CALL_SUMMARY || "";
            const dirMatch = sumBlock.match(/DIRECTION:\s*(Bullish|Bearish)/i);
            const convMatch = sumBlock.match(/CONVICTION:\s*([0-5])/i);
            const isNoTrade = sumBlock.toLowerCase().includes("no trade") || !dirMatch;
            const convScore = convMatch ? parseInt(convMatch[1], 10) : 0;

            if (!isNoTrade && convScore >= 3) {
              setStatusMsg(prev => prev + `\n✓ SUCCESS! Setup Identified: ${dirMatch[1]} (Conviction: ${convScore}/5).`);
              break;
            } else {
              sessionExcluded.push(currentTicker);
              if (attempt < maxAttempts) {
                setStatusMsg(`Result: ${currentTicker} yielded No Trade or low conviction (${convScore}/5). Rejecting and moving to next...`);
                await new Promise(r => setTimeout(r, 2000));
              }
              attempt++;
            }
          } else {
            const verdict = (p.VERDICT || "").toUpperCase();
            if (verdict.includes("BUY")) {
              setStatusMsg(prev => prev + `\n✓ SUCCESS! True Score: ${trueScore}/90. Rated ${p.VERDICT}.`);
              break;
            } else {
              sessionExcluded.push(currentTicker);
              if (attempt < maxAttempts) {
                setStatusMsg(`Result: ${currentTicker} scored ${trueScore}/90 (${p.VERDICT}). Target is 70+. Rejecting and moving to next batch...`);
                await new Promise(r => setTimeout(r, 2000));
              }
              attempt++;
            }
          }
        } else {
          if (isTargeted) {
            setStreamText(txt || "Failed to parse a structured response.");
            break;
          }
          attempt++;
        }
      } // End Agentic Loop

      if (finalParsed) {
        let isSuccess = false;
        
        if (activeMode === "predict") {
          const sumBlock = finalParsed.CALL_SUMMARY || "";
          const dirMatch = sumBlock.match(/DIRECTION:\s*(Bullish|Bearish)/i);
          const convMatch = sumBlock.match(/CONVICTION:\s*([0-5])/i);
          isSuccess = dirMatch && convMatch && parseInt(convMatch[1], 10) >= 3;
        } else {
          isSuccess = (finalParsed.VERDICT || "").toUpperCase().includes("BUY");
        }

        if (!isTargeted && !isSuccess) {
          setScannedBatch(localBatch);
          setUnlucky(true);
        } else {
          setParsed(finalParsed);
          setRawResult(finalRaw);
          setLq(finalLq);
        }
      } else if (!isTargeted && !streamText) {
        setScannedBatch(localBatch);
        setUnlucky(true);
      }

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  }, [mode, ticker, marketCapFilter, useFinnhub, finnhubKey, geminiKey, watchlist, scanHistory]);

  const currentTicker = parsed ? (parseKV(parsed.HEADER).TICKER || ticker.toUpperCase()) : "";
  const isSaved = watchlist.some(w => w.ticker === currentTicker);
  const toggleWatchlist = () => {
    let newWatchlist = [];
    if (isSaved) {
      newWatchlist = watchlist.filter(i => i.ticker !== currentTicker);
      setWatchlist(newWatchlist);
    } else {
      newWatchlist = [{ ticker: currentTicker, company: lq?.company || parseKV(parsed?.HEADER)?.COMPANY || currentTicker, verdict: parsed?.VERDICT, price: lq ? `$${lq.price.toFixed(2)}` : parseKV(parsed?.HEADER)?.CURRENT_PRICE, timestamp: Date.now(), rawResult, lq }, ...watchlist];
      setWatchlist(newWatchlist);
    }
    
    // Auto-sync to Vercel KV cloud if logged in
    if (isLoggedIn && username) {
      fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, watchlist: newWatchlist })
      }).catch(e => console.log("Cloud sync failed:", e));
    }
  };

  // Keep local storage up to date as a fallback
  useEffect(() => {
    localStorage.setItem("value_analyst_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);
  
  // Changed: No longer loads raw result from memory, instead triggers a fresh live analysis
  const handleHistorySelect = (item) => { 
    if (item.rawResult) {
      // Local Watchlist format (has full data)
      setMode("analyze"); setTicker(item.ticker); setRawResult(item.rawResult); setParsed(parseAnalysis(item.rawResult)); setLq(item.lq || null);
    } else {
      // Global Leaderboard format (needs fresh run)
      run("analyze", item.ticker);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0A0E17] text-slate-200 font-sans selection:bg-[#B8860B] selection:text-[#0A0E17]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @media print { body { background: #0A0E17 !important; color: #E2E8F0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      `}</style>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
          <div className="glass-panel p-8 rounded-2xl max-w-sm w-full outline outline-1 outline-[#1E293B] shadow-2xl relative text-center bg-[#0A0E17]">
            <button onClick={() => setShowPinModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer text-xl">✕</button>
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-slate-200 m-0 mb-2">Unlock Advanced Features</h3>
            <p className="text-sm text-slate-400 m-0 mb-6 leading-relaxed">Enter PIN to access deep ETF analysis, 100-max scan lengths, and auto-populated API keys.</p>
            <form onSubmit={(e) => { e.preventDefault(); fetchKeysWithPin(pinInput, true); }}>
              <input type="password" autoFocus value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(""); }} placeholder="Enter PIN..." className="w-full bg-[#111827] border border-[#1E293B] focus:border-[#B8860B] text-slate-200 px-4 py-3 rounded-xl mb-4 text-center text-lg tracking-[0.5em] font-mono outline-none" />
              {pinError && <div className="text-red-500 text-xs font-mono text-center mb-4">{pinError}</div>}
              <button type="submit" className="w-full bg-gradient-to-r from-[#B8860B] to-[#B8860B] text-[#0A0E17] font-semibold py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity">Unlock</button>
            </form>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
          <div className="glass-panel p-8 rounded-2xl max-w-sm w-full outline outline-1 outline-[#1E293B] shadow-2xl relative bg-[#0A0E17]">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer text-xl">✕</button>
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold text-slate-200 m-0 mb-2">Cloud Synced Account</h3>
              <p className="text-sm text-slate-400 m-0">Securely sync your watchlists and scores to the global cloud.</p>
            </div>
            
            <div className="flex rounded-lg bg-[#111827] p-1 mb-5">
               <button onClick={() => {setAuthMode("login"); setAuthError("");}} className={`flex-1 text-xs py-2 rounded-md font-mono transition-colors ${authMode==="login"?'bg-[#B8860B] text-[#0A0E17] font-bold':'text-slate-400 hover:text-slate-200 cursor-pointer'}`}>SIGN IN</button>
               <button onClick={() => {setAuthMode("register"); setAuthError("");}} className={`flex-1 text-xs py-2 rounded-md font-mono transition-colors ${authMode==="register"?'bg-[#B8860B] text-[#0A0E17] font-bold':'text-slate-400 hover:text-slate-200 cursor-pointer'}`}>REGISTER</button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} className="w-full bg-[#111827] border border-[#1E293B] focus:border-[#B8860B] text-slate-200 px-4 py-3 rounded-xl text-sm outline-none" placeholder="analyst_01" />
              </div>
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Password</label>
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} className="w-full bg-[#111827] border border-[#1E293B] focus:border-[#B8860B] text-slate-200 px-4 py-3 rounded-xl text-sm outline-none" placeholder="••••••" />
              </div>
              
              {authError && <div className="text-red-500 text-xs text-center mb-4">{authError}</div>}
              
              <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-[#B8860B] to-[#B8860B] text-[#0A0E17] font-semibold py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
                {authLoading ? "Processing..." : authMode === "login" ? "Secure Login" : "Create Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      <TopNav useFinnhub={useFinnhub} setUseFinnhub={setUseFinnhub} geminiKey={geminiKey} setGeminiKey={setGeminiKey} finnhubKey={finnhubKey} setFinnhubKey={setFinnhubKey} hasData={parsed || streamText || loading || error || unlucky} onReset={reset} onUnlockClick={() => { setPinInput(""); setPinError(""); setShowPinModal(true); }} isUnlocked={isUnlocked} isLoggedIn={isLoggedIn} username={username} onLoginClick={() => setShowLoginModal(true)} onLogout={handleLogout} />

      <main className="max-w-[900px] mx-auto py-8 px-5">
        {!mode && !loading && !parsed && !streamText && !error && !unlucky && (
          <>
            <WelcomeScreen setMode={setMode} scanLength={scanLength} setScanLength={setScanLength} isUnlocked={isUnlocked} onUnlockClick={() => { setPinInput(""); setPinError(""); setShowPinModal(true); }} isLoggedIn={isLoggedIn} username={username} onLoginClick={() => setShowLoginModal(true)} onLogout={handleLogout} />
            <div className="flex justify-center gap-4 mb-4 mt-6">
               <button onClick={() => setShowEtfs(false)} className={`px-5 py-2 rounded-full font-mono text-sm tracking-widest uppercase font-bold transition-all duration-300 cursor-pointer ${!showEtfs ? 'bg-[#B8860B] text-[#0A0E17] shadow-[0_0_15px_rgba(212,160,23,0.3)]' : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200'}`}>Stocks</button>
               <button onClick={() => setShowEtfs(true)} className={`px-5 py-2 rounded-full font-mono text-sm tracking-widest uppercase font-bold transition-all duration-300 cursor-pointer ${showEtfs ? 'bg-[#B8860B] text-[#0A0E17] shadow-[0_0_15px_rgba(212,160,23,0.3)]' : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200'}`}>ETFs Tracker</button>
            </div>
            <LeaderboardDisplay data={showEtfs ? etfLeaderboard : leaderboard} onSelect={handleHistorySelect} />
            {watchlist.length > 0 && <WatchlistGrid watchlist={watchlist} onSelect={handleHistorySelect} />}
          </>
        )}

        {mode && !loading && !parsed && !streamText && !error && !unlucky && <AnalysisForm mode={mode} ticker={ticker} setTicker={setTicker} onRun={(m, t) => run(m, t)} onBack={() => setMode(null)} inputRef={inputRef} marketCapFilter={marketCapFilter} setMarketCapFilter={setMarketCapFilter} files={sessionFiles} setFiles={setSessionFiles} isUnlocked={isUnlocked} assetType={assetType} setAssetType={setAssetType} etfDepth={etfDepth} setEtfDepth={setEtfDepth} customEtfCount={customEtfCount} setCustomEtfCount={setCustomEtfCount} onUnlockClick={() => { setPinInput(""); setPinError(""); setShowPinModal(true); }} />}
        
        {unlucky && !loading && (
          <div className="animate-[fadeIn_0.4s_ease] bg-[#111827] border border-[#1E293B] rounded-xl p-10 text-center mt-6">
            <div className="text-5xl mb-5">{mode === "predict" ? "🛡️" : "🎰"}</div>
            <h3 className="text-2xl font-semibold text-slate-200 mb-3">{mode === "predict" ? "Capital Preserved." : "Unlucky!"}</h3>
            <p className="text-[14px] text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              {mode === "predict" 
                ? "We surveyed near-term binary events, but none met the 3/5 minimum conviction threshold for a directional swing trade. Waiting for a better setup."
                : `We scanned a batch of ${marketCapFilter !== "Any" ? marketCapFilter + "-cap " : ""}candidates, but none met the rigorous 75/90 "Buy" threshold. The strict Chicago Booth methodology kept your capital safe!`
              }
            </p>

            {scannedBatch.length > 0 && (
              <div className="mb-10">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Candidates Evaluated</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {scannedBatch.map((item, idx) => {
                    const isPredict = mode === "predict";
                    const displayVal = isPredict ? `${item.score}/5` : `${item.score}/90`;
                    const colorClass = isPredict 
                      ? (item.score >= 3 ? 'text-[#B8860B]' : 'text-slate-400')
                      : (item.score >= 60 ? 'text-[#B8860B]' : 'text-red-500');
                    const label = isPredict ? "Conviction" : "Score";
                      
                    return (
                      <button
                        key={item.ticker + idx}
                        onClick={() => run("analyze", item.ticker)}
                        className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#B8860B] rounded-xl p-4 cursor-pointer transition-all duration-200 group flex flex-col items-center shadow-md relative"
                      >
                        <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mb-1">{label}</div>
                        <div className="text-xl font-mono font-bold text-slate-200 group-hover:text-[#B8860B] transition-colors">{item.ticker}</div>
                        <div className={`text-sm font-mono font-semibold mt-1 mb-2 ${colorClass}`}>{displayVal}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button onClick={() => run()} className="bg-gradient-to-br from-[#B8860B] to-[#B8860B] text-[#0A0E17] hover:opacity-90 px-8 py-3 rounded-md font-semibold text-[15px] transition-all cursor-pointer shadow-lg shadow-[#B8860B]/10">
                Spin Again
              </button>
              <button onClick={() => setUnlucky(false)} className="bg-transparent border border-[#1E293B] hover:border-slate-600 text-slate-300 px-6 py-3 rounded-md font-mono text-[13px] transition-colors cursor-pointer">
                Change Filters
              </button>
            </div>
          </div>
        )}

        {loading && (
          <>
            <LoadingState message={statusMsg} isAutonomous={(mode && mode !== "analyze" && mode !== "earnings")} scanLength={scanLength} />
            {(mode && mode !== "analyze" && mode !== "earnings") && <LiveScanTable data={liveResults} />}
          </>
        )}
        {error && (
          <div className="animate-[fadeIn_0.4s_ease] bg-red-500/10 border border-red-500 rounded-lg p-6 mt-6">
            <div className="text-sm text-red-500 font-semibold mb-2">Analysis Error</div>
            <div className="text-[13px] text-slate-400 leading-relaxed mb-4">{error}</div>
            <button onClick={reset} className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 px-5 py-2 rounded cursor-pointer text-[13px] font-mono transition-colors">Try Again</button>
          </div>
        )}
        {streamText && !parsed && !loading && <div className="animate-[fadeIn_0.5s_ease]"><Section title="Analysis Results" icon="📄"><pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{streamText}</pre></Section></div>}
        {parsed && !loading && <AnalysisResults parsed={parsed} lq={lq} rawResult={rawResult} currentTicker={currentTicker} isSaved={isSaved} toggleWatchlist={toggleWatchlist} live={!!lq} useFinnhub={useFinnhub} mode={mode} />}
      </main>
      
      <ChatBubble geminiKey={geminiKey} />
    </div>
  );
}
