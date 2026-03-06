import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONSTANTS & CONFIG ───
const QUOTE_PROXY = "https://quote-proxy-1nj5vhpae-keenans-projects-22e06faf.vercel.app";
const RUNTIME_API_KEY = ""; // Runtime provides the key automatically

// Expanded from ~125 to 250+ vetted stocks to deeply dilute LLM biases
const MODES = [
  { id: "scan", label: "I'm Feeling Lucky", desc: "Autonomously find undervalued stocks", icon: "🍀" },
  { id: "analyze", label: "Analyze Ticker", desc: "Deep dive on a specific stock", icon: "📊" },
  { id: "earnings", label: "Earnings Analysis", desc: "Post-earnings drift analysis", icon: "📈" },
  { id: "adr", label: "ADR Scanner", desc: "International value opportunities", icon: "🌍" },
  { id: "sector", label: "Sector Rotation", desc: "Best stock in worst sector", icon: "🔄" },
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
2. QUALITATIVE SEARCH ONLY: Use Google Search ONLY to find qualitative data, news, historical earnings context, and narrative analysis.
3. FALLBACK EXCEPTION: If and ONLY if the "LIVE MARKET DATA" block is completely missing, you may fallback to using Google Search for the current stock price.
4. NO PLACEHOLDERS: NEVER output "[$XX.XX]", "[Symbol]", or "[Searching...]". Fill out EVERY field with real data.
5. CHAIN OF THOUGHT: You MUST follow the exact output structure below. You will perform the textual analysis first (DuPont, Income, Balance Sheet) to build your reasoning BEFORE you calculate the final scores and verdict.

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
- Strong Buy >= 82/90, Buy >= 75/90, Hold 55-74, Avoid < 55, Strong Avoid < 45.
- This is for educational/research purposes only, not financial advice.`;


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

const callGemini = async (promptText, sysPrompt, apiKey) => {
  const payload = {
    systemInstruction: { parts: [{ text: sysPrompt }] },
    contents: [{ parts: [{ text: promptText }] }],
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


// ─── UI COMPONENTS ───
const Badge = ({ v }) => {
  const x = (v || "").toLowerCase();
  let colors = "bg-brand-gold/15 text-brand-gold border-brand-gold";
  if (x.includes("strong buy")) colors = "bg-green-500/15 text-green-500 border-green-500";
  else if (x.includes("buy")) colors = "bg-green-400/10 text-green-400 border-green-400";
  else if (x.includes("hold")) colors = "bg-amber-500/10 text-amber-500 border-amber-500";
  else if (x.includes("strong avoid")) colors = "bg-red-500/15 text-red-500 border-red-500";
  else if (x.includes("avoid")) colors = "bg-red-400/10 text-red-400 border-red-400";
  
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
      <h3 className="m-0 text-[13px] font-mono text-[#D4A017] uppercase tracking-widest font-semibold">{title}</h3>
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
          <div className="text-xl font-mono font-semibold text-[#D4A017]">${base.toFixed(2)}</div>
        </div>
      </div>

      <div className="relative h-1.5 bg-[#1E293B] rounded-full mx-5">
        {low52 && high52 && <div className="absolute top-[2px] bottom-[2px] bg-slate-700 rounded-sm" style={{ left: `${getPct(low52)}%`, right: `${100 - getPct(high52)}%` }} />}
        {bear && bull && (
          <div className="absolute -top-1 -bottom-1 bg-[#D4A017]/15 border-x border-dashed border-[#D4A017]/50 rounded-sm" style={{ left: `${getPct(Math.min(bear, bull))}%`, right: `${100 - getPct(Math.max(bear, bull))}%` }}>
            <div className="absolute -top-5 w-full text-center text-[9px] font-mono text-[#D4A017]/80 tracking-wider">FV ZONE</div>
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
          <div className="absolute -top-2 -bottom-2 w-0.5 bg-[#D4A017] z-10" style={{ left: `${getPct(base)}%` }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#D4A017] font-bold">BASE</div>
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
const TopNav = ({ useFinnhub, setUseFinnhub, geminiKey, setGeminiKey, finnhubKey, setFinnhubKey, hasData, onReset, onUnlockClick }) => (
  <header className="print:hidden sticky top-0 z-50 border-b border-brand-border bg-brand-panel/60 backdrop-blur-xl px-7 py-3.5 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-[#B8860B] flex items-center justify-center text-base font-bold text-brand-dark font-mono shadow-[0_0_15px_rgba(212,160,23,0.4)]">V</div>
      <div>
        <div className="text-[15px] font-semibold text-slate-200">Value Analyst</div>
        <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
          Chicago Booth Protocol <span className="text-green-500 ml-2">● {useFinnhub ? "Finnhub Enabled" : "Web Search"}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 mr-2">
        <button onClick={() => setUseFinnhub(!useFinnhub)} className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors duration-300 p-0 ${useFinnhub ? 'bg-green-500' : 'bg-slate-700'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 ease-in-out ${useFinnhub ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
        <span className={`text-xs font-mono w-28 ${useFinnhub ? 'text-green-500' : 'text-slate-400'}`}>{useFinnhub ? "Finnhub API" : "Web search mode"}</span>
      </div>

      <button onClick={onUnlockClick} className="mr-2 px-3 py-1.5 bg-[#D4A017]/10 hover:bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#D4A017] rounded cursor-pointer text-xs font-mono transition-colors flex items-center gap-1.5" title="Unlock saved keys via PIN">
        <span>🔐</span> <span className="hidden sm:inline">Auto-fill</span>
      </button>

      <div className="flex flex-col gap-1 hidden md:flex">
        <label className="text-[9px] text-slate-400 font-mono uppercase">Gemini API Key</label>
        <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Paste Gemini Key..." className="w-28 px-2 py-1.5 text-xs font-mono bg-[#0A0E17] border border-[#1E293B] focus:border-[#D4A017] rounded text-slate-200 outline-none transition-colors" />
      </div>

      <div className="flex flex-col gap-1 hidden md:flex">
        <label className="text-[9px] text-slate-400 font-mono uppercase">Finnhub API Key</label>
        <input type="password" value={finnhubKey} onChange={e => setFinnhubKey(e.target.value)} placeholder="Paste Finnhub Key..." className="w-28 px-2 py-1.5 text-xs font-mono bg-[#0A0E17] border border-[#1E293B] focus:border-[#D4A017] rounded text-slate-200 outline-none transition-colors" />
      </div>

      {hasData && (
        <button onClick={onReset} className="self-end bg-transparent border border-[#1E293B] hover:border-slate-600 text-slate-400 px-3.5 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors">
          ← New Scan
        </button>
      )}
    </div>
  </header>
);

const WelcomeScreen = ({ setMode }) => (
  <div className="animate-[fadeIn_0.5s_ease]">
    <div className="text-center mb-10">
      <h1 className="text-3xl font-light m-0 mb-2 tracking-tight text-slate-200">AI Value <span className="text-[#D4A017] font-semibold">Analyst</span></h1>
      <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
        Autonomous fundamental analysis powered by the Chicago Booth methodology. <span className="text-green-500">Real-time pricing via Finnhub.</span>
      </p>
    </div>
    <div className="space-y-4">
      {MODES.map(o => (
        <button key={o.id} onClick={() => setMode(o.id)} className="w-full glass-button rounded-xl p-5 px-6 cursor-pointer text-left flex items-center gap-4 group hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-gold/10">
          <span className="text-3xl w-12 text-center">{o.icon}</span>
          <div className="flex-1">
            <div className="text-base font-semibold text-slate-200 mb-1">{o.label}</div>
            <div className="text-[13px] text-slate-400">{o.desc}</div>
          </div>
          <span className="text-slate-500 text-lg group-hover:text-[#D4A017] transition-colors">→</span>
        </button>
      ))}
    </div>
    <div className="mt-8 p-4 px-5 bg-[#D4A017]/10 border border-[#D4A017]/20 rounded-md text-xs text-slate-400 leading-relaxed text-center">
      <strong className="text-[#D4A017]">Disclaimer:</strong> Educational and research purposes only. Not financial advice.
    </div>
  </div>
);

const LeaderboardDisplay = ({ data, onSelect, onClear }) => (
  <div className="print:hidden animate-[fadeIn_0.6s_ease] mt-12 mb-8">
    <div className="flex justify-between items-end mb-4 px-1">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-200 m-0"><span>🏆</span> Value Leaderboard</h3>
      {data.length > 0 && <button onClick={onClear} className="bg-transparent border-none cursor-pointer text-[10px] uppercase tracking-wider font-mono text-slate-500 hover:text-red-400 transition-colors">Clear History</button>}
    </div>
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-3 px-5 border-b border-[#1E293B] text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-900/50 hidden sm:grid">
        <div className="w-6 text-center">#</div>
        <div>Asset</div>
        <div className="text-right w-20">Score</div>
        <div className="text-center w-28">Verdict</div>
        <div className="text-right w-20">Price</div>
      </div>
      <div className="divide-y divide-[#1E293B]">
        {data.map((item, idx) => (
          <div key={item.ticker} onClick={() => onSelect(item)} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-3 px-5 items-center hover:bg-slate-800/50 cursor-pointer transition-colors group">
            <div className={`w-6 text-center font-mono text-sm font-bold ${idx < 3 ? 'text-[#D4A017]' : 'text-slate-500 group-hover:text-slate-300'}`}>{idx + 1}</div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-slate-200 truncate">{item.ticker}</div>
              <div className="text-[11px] text-slate-500 truncate">{item.company}</div>
            </div>
            <div className="text-right w-20 font-mono text-[#D4A017] font-bold text-base">{item.score}<span className="text-[10px] text-slate-600">/90</span></div>
            <div className="hidden sm:block text-center w-28 scale-[0.8] origin-center"><Badge v={item.verdict} /></div>
            <div className="hidden sm:block text-right w-20 font-mono text-sm text-slate-300">{item.price}</div>
          </div>
        ))}
        {data.length === 0 && <div className="p-8 text-center text-sm text-slate-500 font-mono">No analyses saved yet. Run a scan to populate the leaderboard!</div>}
      </div>
    </div>
  </div>
);

const WatchlistGrid = ({ watchlist, onSelect }) => (
  <div className="print:hidden animate-[fadeIn_0.6s_ease] mt-10">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200"><span>⭐</span> Pinned Watchlist</h3>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
      {watchlist.map(item => (
        <div key={item.ticker} onClick={() => onSelect(item)} className="glass-button rounded-xl p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-gold/10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-lg font-mono font-bold text-[#D4A017]">{item.ticker}</span>
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

const AnalysisForm = ({ mode, ticker, setTicker, onRun, onBack, inputRef, marketCapFilter, setMarketCapFilter }) => {
  const activeMode = MODES.find(m => m.id === mode);
  const isTargeted = mode === "analyze" || mode === "earnings";
  const isValid = !isTargeted || ticker.trim().length > 0;

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
          <div className="mb-6">
            <label className="block text-xs text-slate-400 font-mono uppercase tracking-widest mb-2">Ticker Symbol</label>
            <input ref={inputRef} type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.]/g, ""))} onKeyDown={e => { if (e.key === "Enter" && isValid) onRun(); }} placeholder="e.g. AAPL, INTC, MU" maxLength={6} className="w-full p-4 px-5 text-xl font-mono font-semibold bg-brand-dark/50 border border-brand-border focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-xl text-brand-gold outline-none tracking-widest transition-all shadow-inner" />
            <div className="mt-2 text-[11px] text-green-500 font-mono">● Real-time Finnhub quote will anchor the analysis</div>
          </div>
        ) : (
          <div className="mb-6">
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
                  className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${marketCapFilter === mc ? 'bg-[#D4A017]/15 border-[#D4A017] text-[#D4A017]' : 'bg-[#0A0E17] border-[#1E293B] text-slate-400 hover:border-slate-500'}`}
                >
                  {mc}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <button onClick={isValid ? () => onRun() : undefined} disabled={!isValid} className={`w-full py-4 px-6 text-[15px] font-semibold rounded-xl border-none tracking-wide transition-all duration-300 shadow-lg ${isValid ? "bg-gradient-to-r from-brand-gold to-[#B8860B] text-brand-dark cursor-pointer hover:opacity-90 hover:shadow-brand-gold/20 hover:-translate-y-0.5" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>
          Run Analysis
        </button>
      </div>
    </div>
  );
};

const LoadingState = ({ message }) => (
  <div className="animate-[fadeIn_0.4s_ease] text-center pt-20">
    <div className="relative w-16 h-16 mx-auto mb-7">
      <div className="absolute inset-0 border-2 border-[#1E293B] border-t-[#D4A017] rounded-full animate-[spin_1s_linear_infinite]" />
      <div className="absolute inset-2 border-2 border-[#1E293B] border-b-amber-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
    </div>
    <div className="font-mono text-[13px] text-slate-400 whitespace-pre-line leading-loose text-left max-w-xl mx-auto">
      <span className="inline-block w-2 h-2 rounded-full bg-[#D4A017] mr-2.5 animate-[pulse_1.5s_ease-in-out_infinite]" />{message}
    </div>
    <div className="mt-6 text-xs text-slate-500">This may take 30-60 seconds...</div>
  </div>
);

const AnalysisResults = ({ parsed, lq, rawResult, currentTicker, isSaved, toggleWatchlist, live, useFinnhub }) => {
  const h = parseKV(parsed.HEADER);
  const sc = parseScores(parsed.SCORES);
  const fv = parseFV(parsed.FAIR_VALUE);
  
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
              <span className="text-3xl font-mono font-bold text-[#D4A017]">{h.TICKER || currentTicker || "N/A"}</span>
              {parsed.VERDICT && <Badge v={parsed.VERDICT} />}
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
              <button onClick={() => window.print()} className="bg-[#D4A017]/10 hover:bg-[#D4A017]/20 border border-[#D4A017] text-[#D4A017] px-3 py-1.5 rounded cursor-pointer text-xs font-mono inline-flex items-center gap-1.5 transition-colors">📄 Export PDF</button>
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
      {Object.keys(sc).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3.5">Quantitative</div>
            <ScoreBar label="Earnings Quality" score={sc.EARNINGS_QUALITY} />
            <ScoreBar label="Balance Sheet" score={sc.BALANCE_SHEET} />
            <ScoreBar label="Cash Flow" score={sc.CASH_FLOW} />
            <ScoreBar label="Valuation" score={sc.VALUATION} />
            <ScoreBar label="Capital Alloc" score={sc.CAPITAL_ALLOCATION} />
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-sm font-bold"><span className="text-slate-400">TOTAL</span><span className="text-[#D4A017]">{qn}/50</span></div>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3.5">Qualitative</div>
            <ScoreBar label="Comp. Moat" score={sc.COMPETITIVE_MOAT} />
            <ScoreBar label="Management" score={sc.MANAGEMENT} />
            <ScoreBar label="Catalyst" score={sc.CATALYST} />
            <ScoreBar label="Risk (10=low)" score={sc.RISK_PROFILE} />
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-sm font-bold"><span className="text-slate-400">TOTAL</span><span className="text-[#D4A017]">{ql}/40</span></div>
            <div className="border-t border-[#1E293B] pt-2.5 mt-2.5 flex justify-between font-mono text-base font-bold text-slate-200"><span className="text-slate-200">COMPOSITE</span><span className="text-[#D4A017]">{tot}/90</span></div>
          </div>
        </div>
      )}

      {/* Fair Value Section */}
      {Object.keys(fv).length > 0 && (
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

      {/* Live Metrics */}
      {live && lq && (
        <Section title="Finnhub Live Metrics" icon="📡">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4">
            <MetricBox label="52W High" value={lq.wk52High ? `$${lq.wk52High.toFixed(2)}` : '—'} />
            <MetricBox label="52W Low" value={lq.wk52Low ? `$${lq.wk52Low.toFixed(2)}` : '—'} />
            <MetricBox label="P/E Ratio" value={lq.pe ? lq.pe.toFixed(2) : '—'} />
            <MetricBox label="P/B Ratio" value={lq.pb ? lq.pb.toFixed(2) : '—'} />
            <MetricBox label="Div Yield" value={lq.divYield ? `${lq.divYield.toFixed(2)}%` : '—'} />
            <MetricBox label="Market Cap" value={lq.marketCap || h.MARKET_CAP || '—'} />
          </div>
        </Section>
      )}

      {/* Text Sections */}
      {parsed.THESIS && <Section title="Investment Thesis" icon="💡"><div className="border-l-4 border-[#D4A017] pl-4 italic text-slate-300">{parsed.THESIS}</div></Section>}
      {parsed.SCREENING_RATIONALE && <Section title="Why This Name Surfaced" icon="🎯">{parsed.SCREENING_RATIONALE}</Section>}
      {parsed.EARNINGS_FORECAST && <Section title="Future Earnings Forecast" icon="🔮">{parsed.EARNINGS_FORECAST}</Section>}
      {parsed.INCOME_STATEMENT && <Section title="Income Statement (DuPont Analysis)" icon="📊">{parsed.INCOME_STATEMENT}</Section>}
      {parsed.BALANCE_SHEET && <Section title="Balance Sheet" icon="🏦">{parsed.BALANCE_SHEET}</Section>}
      {parsed.CASH_FLOW && <Section title="Cash Flow" icon="💰">{parsed.CASH_FLOW}</Section>}
      {parsed.VALUATION && <Section title="Valuation" icon="⚖️">{parsed.VALUATION}</Section>}
      {parsed.QUALITATIVE && <Section title="Qualitative" icon="🔬">{parsed.QUALITATIVE}</Section>}

      {/* Risks & Catalysts Split */}
      {(parsed.CATALYSTS || parsed.RISKS) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {parsed.CATALYSTS && (
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
              <div className="flex items-center gap-2.5 mb-3.5"><span className="text-base">🚀</span><h3 className="m-0 text-[13px] font-mono text-green-500 uppercase tracking-widest font-semibold">Catalysts</h3></div>
              <div className="text-[13px] leading-relaxed text-slate-300">{parsed.CATALYSTS}</div>
            </div>
          )}
          {parsed.RISKS && (
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 px-6 print:break-inside-avoid">
              <div className="flex items-center gap-2.5 mb-3.5"><span className="text-base">⚠️</span><h3 className="m-0 text-[13px] font-mono text-red-500 uppercase tracking-widest font-semibold">Risks</h3></div>
              <div className="text-[13px] leading-relaxed text-slate-300">{parsed.RISKS}</div>
            </div>
          )}
        </div>
      )}

      {parsed.VALUE_TRAP_CHECK && <Section title="Value Trap Check" icon="🪤">{parsed.VALUE_TRAP_CHECK}</Section>}
      {parsed.MONITORING && <Section title="Monitoring Triggers" icon="👁️">{parsed.MONITORING}</Section>}
      {parsed.POSITION_SIZING && <Section title="Position Sizing" icon="📐">{parsed.POSITION_SIZING}</Section>}

      <details className="print:hidden mt-4 group">
        <summary className="cursor-pointer text-xs font-mono text-slate-500 py-2 hover:text-slate-300 transition-colors">View Raw Output</summary>
        <pre className="mt-2 bg-[#111827] border border-[#1E293B] rounded-lg p-5 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400 max-h-[400px] overflow-auto">{rawResult}</pre>
      </details>

      <div className="print:hidden mt-6 p-3.5 px-5 bg-[#D4A017]/10 rounded-md border border-[#D4A017]/20 text-[11px] text-slate-500 leading-relaxed text-center">
        Educational and research purposes only. Not financial advice.{live && " Price data via Finnhub."}
      </div>
    </div>
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
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("value_analyst_watchlist")) || []; }
    catch (e) { return []; }
  });

  const [leaderboard, setLeaderboard] = useState(() => {
    try { return JSON.parse(localStorage.getItem("value_analyst_leaderboard")) || []; }
    catch (e) { return []; }
  });

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
  useEffect(() => { localStorage.setItem("value_analyst_leaderboard", JSON.stringify(leaderboard)); }, [leaderboard]);
  useEffect(() => { localStorage.setItem("value_analyst_use_finnhub", JSON.stringify(useFinnhub)); }, [useFinnhub]);
  useEffect(() => { localStorage.setItem("value_analyst_scan_history", JSON.stringify(scanHistory)); }, [scanHistory]);
  useEffect(() => { if (mode && (mode === "analyze" || mode === "earnings") && inputRef.current) inputRef.current.focus(); }, [mode]);

  const fetchKeysWithPin = useCallback(async (pin, isManualSubmit = false) => {
    try {
      if (isManualSubmit) setPinError("");
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
        if (isManualSubmit) setPinError(data.error || "Invalid PIN");
        else localStorage.removeItem("value_analyst_pin");
      }
    } catch (e) {
      if (isManualSubmit) setPinError("Error connecting to server.");
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
  };

  const run = useCallback(async (overrideMode, overrideTicker) => {
    const activeMode = typeof overrideMode === 'string' ? overrideMode : mode;
    const tkRaw = typeof overrideTicker === 'string' ? overrideTicker : ticker;
    const tk = tkRaw.trim().toUpperCase();

    if (typeof overrideMode === 'string') setMode(overrideMode);
    if (typeof overrideTicker === 'string') setTicker(overrideTicker);

    const isTargeted = activeMode === "analyze" || activeMode === "earnings";
    if (isTargeted && !tk) return;

    setLoading(true); setError(null); setRawResult(""); setParsed(null); 
    setStreamText(""); setLq(null); setUnlucky(false);
    
    const activeGeminiKey = geminiKey ? geminiKey.trim() : RUNTIME_API_KEY;
    
    if (!activeGeminiKey) {
      setError("Missing Gemini API Key. Please enter it in the top right corner.");
      setLoading(false);
      return;
    }

    const maxAttempts = isTargeted ? 1 : 6; 
    let attempt = 1;
    let sessionExcluded = []; 
    let localBatch = [];
    let localScanHistory = [...scanHistory]; // Take a snapshot for this run
    let finalParsed = null;
    let finalRaw = "";
    let finalLq = null;
    let finalTickerUsed = tk;

    try {
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

          // Shrink the subset to 4 to further reduce the AI's ability to pick a favorite
          const subsetPool = freshPool.slice(0, 4);
          const capInstruction = ` IMPORTANT: You MUST exclusively select your final ticker from this exact, highly-constrained random subset of stocks: [${subsetPool.join(", ")}]. Pick the single best value play from these exactly. Do not pick ANY stock outside this list.`;

          const discoveryPrompts = {
            scan: `Pick ONE specific, real undervalued U.S. stock.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`,
            adr: `Pick ONE specific international ADR available on US exchanges.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`,
            sector: `Identify an out-of-favor sector, then pick a high-quality company within it.${capInstruction} Return ONLY its ticker symbol enclosed in XML tags: <TICKER>SYMBOL</TICKER>.`
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
        if (activeMode === "analyze" || activeMode === "scan" || activeMode === "adr" || activeMode === "sector") {
            analysisPromptText = `MODE: ${activeMode}\nTICKER: ${currentTicker}\n\n${ldb}\n\n${baseInstr}\n\nOutput in the required structured format. NO PLACEHOLDERS. FILL EVERY FIELD.`;
        } else if (activeMode === "earnings") {
             analysisPromptText = `MODE: earnings\nTICKER: ${currentTicker}\n\n${ldb}\n\nPerform a post-earnings drift analysis on ${currentTicker}. Search for the most recent earnings results vs consensus, stock reaction, forward guidance, and analyst revisions. Predict the direction of next quarter's earnings. ${useFinnhub ? "YOU MUST USE THE PROVIDED LIVE MARKET DATA." : ""}\n\nOutput in the required structured format. NO PLACEHOLDERS. FILL EVERY FIELD.`;
        }

        const txt = await callGemini(analysisPromptText, SYSTEM_PROMPT, activeGeminiKey);
        const p = parseAnalysis(txt);
        
        if (Object.keys(p).length > 2) {
          
          const tempSc = parseScores(p.SCORES);
          const trueScore = (tempSc.EARNINGS_QUALITY||0) + (tempSc.BALANCE_SHEET||0) + (tempSc.CASH_FLOW||0) + 
                            (tempSc.VALUATION||0) + (tempSc.CAPITAL_ALLOCATION||0) + (tempSc.COMPETITIVE_MOAT||0) + 
                            (tempSc.MANAGEMENT||0) + (tempSc.CATALYST||0) + (tempSc.RISK_PROFILE||0);
          
          if (trueScore >= 82) p.VERDICT = "Strong Buy";
          else if (trueScore >= 75) p.VERDICT = "Buy";
          else if (trueScore >= 55) p.VERDICT = "Hold";
          else if (trueScore >= 45) p.VERDICT = "Avoid";
          else p.VERDICT = "Strong Avoid";

          finalParsed = p;
          finalRaw = txt;
          finalLq = currentLq;
          finalTickerUsed = currentTicker;
          
          if (!isTargeted) {
            localBatch.push({ ticker: currentTicker, score: trueScore, verdict: p.VERDICT });
          }

          if (isTargeted) break;

          const verdict = (p.VERDICT || "").toUpperCase();
          if (verdict.includes("BUY")) {
            setStatusMsg(prev => prev + `\n✓ SUCCESS! True Score: ${trueScore}/90. Rated ${p.VERDICT}.`);
            break;
          } else {
            sessionExcluded.push(currentTicker);
            if (attempt < maxAttempts) {
              setStatusMsg(`Result: ${currentTicker} scored ${trueScore}/90 (${p.VERDICT}). Target is 75+. Rejecting and moving to next batch...`);
              await new Promise(r => setTimeout(r, 2000));
            }
            attempt++;
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
        const finalVerdict = (finalParsed.VERDICT || "").toUpperCase();
        
        if (!isTargeted && !finalVerdict.includes("BUY")) {
          setScannedBatch(localBatch);
          setUnlucky(true);
        } else {
          setParsed(finalParsed);
          setRawResult(finalRaw);
          setLq(finalLq);

          // --- LEADERBOARD UPDATE ---
          const sc = parseScores(finalParsed.SCORES);
          const tot = (sc.EARNINGS_QUALITY||0) + (sc.BALANCE_SHEET||0) + (sc.CASH_FLOW||0) + (sc.VALUATION||0) + (sc.CAPITAL_ALLOCATION||0) + 
                      (sc.COMPETITIVE_MOAT||0) + (sc.MANAGEMENT||0) + (sc.CATALYST||0) + (sc.RISK_PROFILE||0);
          
          if (tot > 0) {
            const h = parseKV(finalParsed.HEADER);
            setLeaderboard(prev => {
              const newEntry = {
                ticker: finalTickerUsed,
                company: finalLq?.company || h.COMPANY || finalTickerUsed,
                score: tot,
                verdict: finalParsed.VERDICT,
                price: finalLq ? `$${finalLq.price.toFixed(2)}` : h.CURRENT_PRICE,
                timestamp: Date.now(),
                rawResult: finalRaw,
                lq: finalLq
              };
              const filtered = prev.filter(item => item.ticker !== finalTickerUsed);
              return [...filtered, newEntry].sort((a, b) => b.score - a.score).slice(0, 100); 
            });
          }
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
    if (isSaved) setWatchlist(w => w.filter(i => i.ticker !== currentTicker));
    else setWatchlist(w => [{ ticker: currentTicker, company: lq?.company || parseKV(parsed?.HEADER)?.COMPANY || currentTicker, verdict: parsed?.VERDICT, price: lq ? `$${lq.price.toFixed(2)}` : parseKV(parsed?.HEADER)?.CURRENT_PRICE, timestamp: Date.now(), rawResult, lq }, ...w]);
  };
  const handleHistorySelect = (item) => { setMode("analyze"); setTicker(item.ticker); setRawResult(item.rawResult); setParsed(parseAnalysis(item.rawResult)); setLq(item.lq || null); };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 font-sans selection:bg-[#D4A017] selection:text-[#0A0E17]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @media print { body { background: #0A0E17 !important; color: #E2E8F0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      `}</style>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]">
          <div className="glass-panel p-8 rounded-2xl max-w-sm w-full outline outline-1 outline-[#1E293B] shadow-2xl relative text-center bg-[#0A0E17]">
            <button onClick={() => setShowPinModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer text-xl">✕</button>
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-slate-200 m-0 mb-2">Unlock API Keys</h3>
            <p className="text-sm text-slate-400 m-0 mb-6">Enter your PIN to auto-fill keys from Vercel.</p>
            <form onSubmit={(e) => { e.preventDefault(); fetchKeysWithPin(pinInput, true); }}>
              <input type="password" autoFocus value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(""); }} placeholder="Enter PIN..." className="w-full bg-[#111827] border border-[#1E293B] focus:border-[#D4A017] text-slate-200 px-4 py-3 rounded-xl mb-4 text-center text-lg tracking-[0.5em] font-mono outline-none" />
              {pinError && <div className="text-red-500 text-xs font-mono text-center mb-4">{pinError}</div>}
              <button type="submit" className="w-full bg-gradient-to-r from-[#D4A017] to-[#B8860B] text-[#0A0E17] font-semibold py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity">Unlock</button>
            </form>
          </div>
        </div>
      )}

      <TopNav useFinnhub={useFinnhub} setUseFinnhub={setUseFinnhub} geminiKey={geminiKey} setGeminiKey={setGeminiKey} finnhubKey={finnhubKey} setFinnhubKey={setFinnhubKey} hasData={parsed || streamText || loading || error || unlucky} onReset={reset} onUnlockClick={() => { setPinInput(""); setPinError(""); setShowPinModal(true); }} />

      <main className="max-w-[900px] mx-auto py-8 px-5">
        {!mode && !loading && !parsed && !streamText && !error && !unlucky && (
          <>
            <WelcomeScreen setMode={setMode} />
            <LeaderboardDisplay data={leaderboard} onSelect={handleHistorySelect} onClear={() => setLeaderboard([])} />
            {watchlist.length > 0 && <WatchlistGrid watchlist={watchlist} onSelect={handleHistorySelect} />}
          </>
        )}

        {mode && !loading && !parsed && !streamText && !error && !unlucky && <AnalysisForm mode={mode} ticker={ticker} setTicker={setTicker} onRun={() => run()} onBack={() => setMode(null)} inputRef={inputRef} marketCapFilter={marketCapFilter} setMarketCapFilter={setMarketCapFilter} />}
        
        {unlucky && !loading && (
          <div className="animate-[fadeIn_0.4s_ease] bg-[#111827] border border-[#1E293B] rounded-xl p-10 text-center mt-6">
            <div className="text-5xl mb-5">🎰</div>
            <h3 className="text-2xl font-semibold text-slate-200 mb-3">Unlucky!</h3>
            <p className="text-[14px] text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              We scanned a batch of {marketCapFilter !== "Any" ? marketCapFilter + "-cap " : ""}candidates, but none met the rigorous 75/90 "Buy" threshold. The strict Chicago Booth methodology kept your capital safe!
            </p>

            {scannedBatch.length > 0 && (
              <div className="mb-10">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Candidates Evaluated</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {scannedBatch.map((item, idx) => (
                    <button
                      key={item.ticker + idx}
                      onClick={() => run("analyze", item.ticker)}
                      className="bg-[#0A0E17] border border-[#1E293B] hover:border-[#D4A017] rounded-xl p-4 cursor-pointer transition-all duration-200 group flex flex-col items-center shadow-md"
                    >
                      <div className="text-xl font-mono font-bold text-slate-200 group-hover:text-[#D4A017] transition-colors">{item.ticker}</div>
                      <div className={`text-sm font-mono font-semibold mt-1 mb-2 ${item.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{item.score}/90</div>
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-auto opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                        <span>Analyze</span> <span className="text-[10px]">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button onClick={() => run()} className="bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-[#0A0E17] hover:opacity-90 px-8 py-3 rounded-md font-semibold text-[15px] transition-all cursor-pointer shadow-lg shadow-[#D4A017]/10">
                Spin Again
              </button>
              <button onClick={() => setUnlucky(false)} className="bg-transparent border border-[#1E293B] hover:border-slate-600 text-slate-300 px-6 py-3 rounded-md font-mono text-[13px] transition-colors cursor-pointer">
                Change Filters
              </button>
            </div>
          </div>
        )}

        {loading && <LoadingState message={statusMsg} />}
        {error && (
          <div className="animate-[fadeIn_0.4s_ease] bg-red-500/10 border border-red-500 rounded-lg p-6 mt-6">
            <div className="text-sm text-red-500 font-semibold mb-2">Analysis Error</div>
            <div className="text-[13px] text-slate-400 leading-relaxed mb-4">{error}</div>
            <button onClick={reset} className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 px-5 py-2 rounded cursor-pointer text-[13px] font-mono transition-colors">Try Again</button>
          </div>
        )}
        {streamText && !parsed && !loading && <div className="animate-[fadeIn_0.5s_ease]"><Section title="Analysis Results" icon="📄"><pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{streamText}</pre></Section></div>}
        {parsed && !loading && <AnalysisResults parsed={parsed} lq={lq} rawResult={rawResult} currentTicker={currentTicker} isSaved={isSaved} toggleWatchlist={toggleWatchlist} live={!!lq} useFinnhub={useFinnhub} />}
      </main>
    </div>
  );
}
