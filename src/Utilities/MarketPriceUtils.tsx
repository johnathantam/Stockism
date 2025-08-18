import type { MarketEvent, MarketPressure } from "../Interfaces/MarketEventInterface";
import type { MarketIndexFundInterface, MarketNodeHandles, MarketStockInterface } from "../Interfaces/MarketStockInterface";
import type { EventEngine } from "./MarketEventEngine";
import { gaussianNoise } from "./RandomEngine";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Tempered fat-tail: mostly Gaussian, rare larger moves, always capped.
function temperedShock(scale = 1): number {
  const pTail = 0.05;               // 5% tail probability
  const cap = 4.0;                  // cap in standard deviations
  const z = (Math.random() < pTail ? gaussianNoise() * 2.5 : gaussianNoise());
  return clamp(z, -cap, cap) * scale;
}

// Map riskRating (~0.01..0.5) to daily base volatility (1%..6%)
// Feel free to retune these two numbers for your sim’s “speed”.
function baseDailySigma(riskRating: number): number {
  const rr = clamp(riskRating, 0.01, 0.5);
  return mix(0.01, 0.06, (rr - 0.01) / (0.5 - 0.01)); // 1% to 6% daily
}

// Squash any unbounded sentiment/drift numbers into small, safe biases.
function squash(x: number, scale = 0.01): number {
  // tanh-like squash without importing Math.tanh for tiny perf wins
  const y = x / (1 + Math.abs(x));
  return y * scale; // keep tiny
}

type AggPressures = {
  drift: number;       // dimensionless
  sentiment: number;   // dimensionless
  turbulence: number;  // multiplier >= 0
};

// Combine field + stock + active events with bounds and gentle scaling
function aggregatePressures(
  stock: MarketStockInterface,
  activeEvents: MarketEvent[],
  fieldPressures: Record<string, MarketPressure>,
  stockPressures: Record<string, MarketPressure>
): AggPressures {
  const f = fieldPressures[stock.field] || { drift: 0, sentiment: 0, turbulence: 1 };
  const s = stockPressures[stock.name] || { drift: 0, sentiment: 0, turbulence: 1 };

  let drift = f.drift + s.drift;
  let sentiment = f.sentiment + s.sentiment;
  let turbulence = (f.turbulence ?? 1) * (s.turbulence ?? 1);

  // Blend in events (bounded)
  for (const e of activeEvents) {
    const affectsField = e.affectedFields?.includes(stock.field);
    const affectsStock = e.affectedStocks?.includes(stock.name);
    if (affectsField || affectsStock) {
      drift += e.driftDelta ?? 0;
      sentiment += e.sentimentDelta ?? 0;
      // turbulence multiplier, but bounded per-event
      const tDelta = clamp(e.turbulenceDelta ?? 0, -0.5, 1.0); // -50%..+100%
      turbulence *= 1 + tDelta;
    }
  }

  // Safety bounds
  turbulence = clamp(turbulence, 0.5, 3.0);      // keep σ multiplier sane
  drift = clamp(drift, -5, 5);                   // arbitrary but safe
  sentiment = clamp(sentiment, -5, 5);

  return { drift, sentiment, turbulence };
}

// Simple variance “memory” from last few log-returns (vol clustering)
function recentLogVar(stock: MarketStockInterface, lookback = 5): number {
  const n = stock.priceHistory.length;
  const start = Math.max(1, n - lookback);
  const logs: number[] = [];
  for (let i = start; i < n; i++) {
    const p0 = stock.priceHistory[i - 1].price;
    const p1 = stock.priceHistory[i].price;
    if (p0 > 0 && p1 > 0) logs.push(Math.log(p1 / p0));
  }
  if (!logs.length) return 0;
  const m = logs.reduce((a, b) => a + b, 0) / logs.length;
  const v = logs.reduce((a, b) => a + (b - m) * (b - m), 0) / logs.length;
  return v;
}

/* --------------------- Minute-by-minute updates --------------------- */

const MIN_PER_DAY = 390;              // 6.5h US cash session
const DT_MIN = 1 / MIN_PER_DAY;       // per-minute time fraction
const MINUTE_CIRCUIT = 0.02;          // +/-2% minute cap

const fluctuateStockPrices = (
  marketStocks: MarketStockInterface[],
  activeEvents: MarketEvent[],
  fieldPressures: Record<string, MarketPressure>,
  stockPressures: Record<string, MarketPressure>
): MarketStockInterface[] => {
  return marketStocks.map((stock) => {
    const { drift, sentiment, turbulence } = aggregatePressures(stock, activeEvents, fieldPressures, stockPressures);

    // Base daily sigma by risk, then scaled down to minute
    const sigmaDay = baseDailySigma(stock.riskRating) * turbulence;       // e.g., 1%..18% if turbulence=3
    const sigmaMin = sigmaDay * Math.sqrt(DT_MIN);

    // Volatility clustering (tempered)
    const varRecent = recentLogVar(stock, 10);
    const clusterBoost = clamp(1 + 4 * varRecent, 0.8, 1.5); // small boost, bounded
    const sigmaEff = clamp(sigmaMin * clusterBoost, 0.0002, 0.03); // 2 bps .. 3% per minute (hard ceiling)

    // Tiny biases per minute (already very small)
    const muBias = squash(drift, 0.0005) + squash(sentiment, 0.0005);

    // Mean reversion to 20-period average (very gentle)
    const ph = stock.priceHistory;
    const recent = ph.slice(-20);
    const avg = recent.length ? recent.reduce((a, b) => a + b.price, 0) / recent.length : stock.price;
    const reversion = clamp((avg - stock.price) / stock.price, -0.05, 0.05) * 0.05; // small, bounded

    // Log-return
    const eps = temperedShock(1);
    const r = (muBias + reversion) * DT_MIN + sigmaEff * eps;

    // Convert to percentage change and apply minute circuit breaker
    let pct = Math.expm1(r); // exp(r) - 1
    pct = clamp(pct, -MINUTE_CIRCUIT, MINUTE_CIRCUIT);

    const newPrice = Math.max(0.01, parseFloat((stock.price * (1 + pct)).toFixed(2)));

    // Update last intraday slot instead of appending a day
    const newPriceHistory = [...ph];
    const lastIdx = newPriceHistory.length - 1;
    newPriceHistory[lastIdx] = { ...newPriceHistory[lastIdx], price: newPrice };

    return {
      ...stock,
      price: newPrice,
      trend: Math.round(((newPrice - stock.price) / stock.price) * 10000) / 100,
      priceHistory: newPriceHistory,
    };
  });
};

/* ------------------------- Day-by-day updates ------------------------ */

const DAY_CIRCUIT = 0.15; // +/-15% per day cap
const MOMENTUM_WINDOW = 3;
const RECOVERY_WINDOW = 7;

const generateTomorrowsStockPrices = (
  marketStocks: MarketStockInterface[],
  activeEvents: MarketEvent[],
  fieldPressures: Record<string, MarketPressure>,
  stockPressures: Record<string, MarketPressure>
): MarketStockInterface[] => {
  // Light market regime bias (kept tiny to avoid runaway)
  const regimeBias = (() => {
    const r = Math.random();
    if (r < 0.33) return 0.000;   // neutral
    if (r < 0.66) return 0.002;   // bull
    return -0.002;                // bear
  })();

  return marketStocks.map((stock) => {
    const { drift, sentiment, turbulence } = aggregatePressures(stock, activeEvents, fieldPressures, stockPressures);

    // Base and effective daily volatility
    const sigmaDay = baseDailySigma(stock.riskRating) * turbulence;
    const varRecent = recentLogVar(stock, 5);
    const clusterBoost = clamp(1 + 8 * varRecent, 0.8, 2.0);
    const sigmaEff = clamp(sigmaDay * clusterBoost, 0.005, 0.12); // 0.5%..12% daily σ

    // Daily μ
    let mu = squash(drift, 0.01) + squash(sentiment, 0.01) + regimeBias;

    // Momentum (gentle, bounded)
    const ph = stock.priceHistory;
    const recent = ph.slice(-MOMENTUM_WINDOW);
    if (recent.length >= 2) {
      const m = (recent[recent.length - 1].price - recent[0].price) / Math.max(0.01, recent[0].price);
      mu += clamp(m, -0.05, 0.05) * 0.05; // convert to small μ boost
    }

    // Recovery toward 7-day average (buy the dip / sell the rip)
    const rec = ph.slice(-RECOVERY_WINDOW);
    if (rec.length) {
      const avg = rec.reduce((a, b) => a + b.price, 0) / rec.length;
      const dev = clamp((avg - stock.price) / Math.max(0.01, avg), -0.2, 0.2);
      mu += dev * 0.02;
    }

    // Log-return with tempered shock
    const eps = temperedShock(1);
    const r = mu + sigmaEff * eps;

    // Apply daily circuit breaker
    let pct = Math.expm1(r);
    pct = clamp(pct, -DAY_CIRCUIT, DAY_CIRCUIT);

    const newPrice = Math.max(0.01, parseFloat((stock.price * (1 + pct)).toFixed(2)));

    // Risk dynamics: very slow and bounded
    let nextRisk = stock.riskRating;
    if (newPrice < stock.price * 0.85) nextRisk *= 1.03; // mild uptick in risk after a bad day
    if (newPrice > stock.price * 1.10) nextRisk *= 0.98; // mild decrease after solid up day
    nextRisk = clamp(nextRisk, 0.01, 0.5);

    const nextDay = stock.priceHistory.length - 1;

    return {
      ...stock,
      price: newPrice,
      trend: Math.round(((newPrice - stock.price) / stock.price) * 10000) / 100,
      riskRating: nextRisk,
      priceHistory: stock.priceHistory.concat({ day: nextDay + 1, price: newPrice }),
    };
  });
};

/* ----------------------------- Index funds --------------------------- */

const updateIndexFundPrices = (
  marketStocks: MarketStockInterface[],
  indexFunds: MarketIndexFundInterface[],
  newDay: boolean = false
): MarketIndexFundInterface[] => {
  return indexFunds.map((indexFund: MarketIndexFundInterface) => {
    const heldStocks = indexFund.stocksHeld
      .map(held => {
        const actualStock = marketStocks.find(s => s.name === held.name);
        return actualStock ? { ...actualStock, sharesHeld: held.sharesHeld } : null;
      })
      .filter((s): s is MarketStockInterface & { sharesHeld: number } => s !== null);

    const totalValue = heldStocks.reduce((sum, s) => sum + s.price * s.sharesHeld, 0);
    const totalShares = heldStocks.reduce((sum, s) => sum + s.sharesHeld, 0);

    let newPrice = indexFund.price;
    if (totalShares > 0) {
      newPrice = parseFloat((totalValue / totalShares).toFixed(2));
    }

    // Tiny tracking error + fee drag (sub-basis-point scale per day)
    if (newDay) newPrice *= 0.9999 + gaussianNoise() * 0.0001;

    const newPriceHistory = [...indexFund.priceHistory];
    const lastDay = newPriceHistory[newPriceHistory.length - 1]?.day ?? 1;
    if (newDay) {
      newPriceHistory.push({ day: lastDay + 1, price: newPrice });
    } else {
      newPriceHistory[newPriceHistory.length - 1] = { day: lastDay, price: newPrice };
    }

    const trend = Math.round(((newPrice - indexFund.price) / indexFund.price) * 10000) / 100;

    return {
      ...indexFund,
      price: newPrice,
      priceHistory: newPriceHistory,
      trend,
    };
  });
};

/* ---------------------------- Engine class --------------------------- */

export class MarketPriceEngine {
  private eventEngine: EventEngine | undefined = undefined;
  private market: MarketNodeHandles | undefined = undefined;

  public attachEventEngine(eventEngine: EventEngine): void {
    this.eventEngine = eventEngine;
  }

  public attachMarket(market: MarketNodeHandles): void {
    this.market = market;
  }

  public fluctuateMarketPricesByMinute(): void {
    if (!this.market || !this.eventEngine) return;

    const stocks = this.market.getMarketStocks();
    const fluctuatedMarketStocks = fluctuateStockPrices(
      stocks,
      this.eventEngine.getActiveEvents(),
      this.eventEngine.getFieldPressures(),
      this.eventEngine.getStockPressures()
    );
    const fluctuatedIndexFunds = updateIndexFundPrices(fluctuatedMarketStocks, this.market.getMarketIndexFunds());

    this.market.setMarket(fluctuatedMarketStocks);
    this.market.setMarketIndexFunds(fluctuatedIndexFunds);
  }

  public fluctuateMarketPricesByDays(daysPassed: number = 1): void {
    if (!this.market || !this.eventEngine) return;

    let updatedMarketStocks: MarketStockInterface[] = this.market.getMarketStocks();
    let updatedIndexFunds: MarketIndexFundInterface[] = this.market.getMarketIndexFunds();

    for (let i = 0; i < daysPassed; i++) {
      updatedMarketStocks = generateTomorrowsStockPrices(
        updatedMarketStocks,
        this.eventEngine.getActiveEvents(),
        this.eventEngine.getFieldPressures(),
        this.eventEngine.getStockPressures()
      );
      updatedIndexFunds = updateIndexFundPrices(updatedMarketStocks, updatedIndexFunds, true);
    }

    this.market.setMarket(updatedMarketStocks);
    this.market.setMarketIndexFunds(updatedIndexFunds);
  }
}

export { 
  fluctuateStockPrices, 
  generateTomorrowsStockPrices, 
  updateIndexFundPrices,
}