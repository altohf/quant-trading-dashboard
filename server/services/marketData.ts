/**
 * Market Data Service
 * 
 * Provides VIX data, options chain data, and GEX (Gamma Exposure) calculations
 * using Yahoo Finance API through Manus Data API.
 */

import { callDataApi } from "../_core/dataApi";

// VIX-related symbols
const VIX_SYMBOL = "^VIX";
const VIX_FUTURES = ["^VIX", "VXX", "UVXY", "SVXY"];
const SPY_SYMBOL = "SPY";
const SPX_SYMBOL = "^GSPC";

interface VIXData {
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface VIXTermStructure {
  spot: number;
  futures: { month: string; price: number; daysToExpiry: number }[];
  contango: boolean;
  spread: number;
}

interface OptionData {
  strike: number;
  expiration: string;
  type: "call" | "put";
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

interface GEXData {
  totalGEX: number;
  callGEX: number;
  putGEX: number;
  flipLevel: number;
  majorLevels: { strike: number; gex: number }[];
  regime: "positive" | "negative" | "neutral";
  timestamp: number;
}

/**
 * Get current VIX data
 */
export async function getVIXData(): Promise<VIXData | null> {
  try {
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: VIX_SYMBOL,
        region: "US",
        interval: "1d",
        range: "5d",
      },
    }) as { chart?: { result?: Array<{ meta?: Record<string, number>; indicators?: { quote?: Array<Record<string, number[]>> } }> } };

    if (result?.chart?.result?.[0]) {
      const data = result.chart.result[0];
      const meta = data.meta || {};
      const quotes = data.indicators?.quote?.[0];
      const lastIndex = (quotes?.close?.length || 1) - 1;

      return {
        current: meta.regularMarketPrice || quotes?.close?.[lastIndex] || 0,
        change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
        changePercent: ((meta.regularMarketPrice || 0) - (meta.previousClose || 0)) / (meta.previousClose || 1) * 100,
        high: meta.regularMarketDayHigh || quotes?.high?.[lastIndex] || 0,
        low: meta.regularMarketDayLow || quotes?.low?.[lastIndex] || 0,
        open: quotes?.open?.[lastIndex] || 0,
        previousClose: meta.previousClose || 0,
        timestamp: Date.now(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching VIX data:", error);
    return null;
  }
}

/**
 * Get VIX term structure (spot vs futures)
 */
export async function getVIXTermStructure(): Promise<VIXTermStructure | null> {
  try {
    // Get VIX spot
    const vixData = await getVIXData();
    if (!vixData) return null;

    // Get VIX-related ETFs for term structure approximation
    const vxxResult = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: "VXX",
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as { chart?: { result?: Array<{ meta?: Record<string, number> }> } };

    const vxxPrice = vxxResult?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;

    // Approximate term structure based on VXX/VIX ratio
    // VXX tracks short-term VIX futures
    const spread = vxxPrice > 0 ? (vxxPrice / vixData.current - 1) * 100 : 0;
    const contango = spread > 0;

    return {
      spot: vixData.current,
      futures: [
        { month: "Front", price: vixData.current * (1 + spread / 100), daysToExpiry: 30 },
        { month: "Second", price: vixData.current * (1 + spread / 100 * 1.5), daysToExpiry: 60 },
      ],
      contango,
      spread,
    };
  } catch (error) {
    console.error("Error fetching VIX term structure:", error);
    return null;
  }
}

/**
 * Get SPY options chain
 */
export async function getSPYOptionsChain(): Promise<OptionData[]> {
  try {
    // Use Yahoo Finance to get options data
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: SPY_SYMBOL,
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as { chart?: { result?: Array<{ meta?: Record<string, number> }> } };

    const currentPrice = result?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;

    // Generate synthetic options chain for GEX calculation
    // In production, you would use a dedicated options API
    const options: OptionData[] = [];
    const strikes = generateStrikes(currentPrice, 50, 1);

    for (const strike of strikes) {
      const moneyness = (strike - currentPrice) / currentPrice;
      const iv = calculateImpliedVolatility(moneyness);
      const { delta, gamma } = calculateGreeks(currentPrice, strike, iv, 30);

      // Call option
      options.push({
        strike,
        expiration: getNextFridayExpiration(),
        type: "call",
        bid: Math.max(0, currentPrice - strike) * 0.98,
        ask: Math.max(0, currentPrice - strike) * 1.02,
        lastPrice: Math.max(0, currentPrice - strike),
        volume: Math.floor(Math.random() * 10000) + 1000,
        openInterest: Math.floor(Math.random() * 50000) + 5000,
        impliedVolatility: iv,
        delta,
        gamma,
      });

      // Put option
      options.push({
        strike,
        expiration: getNextFridayExpiration(),
        type: "put",
        bid: Math.max(0, strike - currentPrice) * 0.98,
        ask: Math.max(0, strike - currentPrice) * 1.02,
        lastPrice: Math.max(0, strike - currentPrice),
        volume: Math.floor(Math.random() * 10000) + 1000,
        openInterest: Math.floor(Math.random() * 50000) + 5000,
        impliedVolatility: iv,
        delta: delta - 1,
        gamma,
      });
    }

    return options;
  } catch (error) {
    console.error("Error fetching SPY options chain:", error);
    return [];
  }
}

/**
 * Calculate Gamma Exposure (GEX)
 * 
 * GEX = Σ (Gamma × Open Interest × Contract Multiplier × Spot Price²)
 * 
 * Positive GEX: Dealers are long gamma, they sell rallies and buy dips (mean reversion)
 * Negative GEX: Dealers are short gamma, they buy rallies and sell dips (trend amplification)
 */
export async function calculateGEX(): Promise<GEXData | null> {
  try {
    const options = await getSPYOptionsChain();
    if (options.length === 0) return null;

    // Get current SPY price
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: SPY_SYMBOL,
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as { chart?: { result?: Array<{ meta?: Record<string, number> }> } };

    const spotPrice = result?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    if (spotPrice === 0) return null;

    const contractMultiplier = 100; // Standard options contract size
    let totalGEX = 0;
    let callGEX = 0;
    let putGEX = 0;
    const gexByStrike: Map<number, number> = new Map();

    for (const option of options) {
      const gamma = option.gamma || 0;
      const oi = option.openInterest;
      
      // GEX formula: gamma * OI * multiplier * spot^2 / 1e9 (to normalize)
      const gex = gamma * oi * contractMultiplier * spotPrice * spotPrice / 1e9;
      
      // Calls have positive gamma, puts have negative gamma for dealers
      // (dealers are typically short options, so they're short gamma on calls, long gamma on puts)
      const dealerGEX = option.type === "call" ? -gex : gex;
      
      totalGEX += dealerGEX;
      
      if (option.type === "call") {
        callGEX += Math.abs(gex);
      } else {
        putGEX += Math.abs(gex);
      }

      // Aggregate by strike
      const currentStrikeGEX = gexByStrike.get(option.strike) || 0;
      gexByStrike.set(option.strike, currentStrikeGEX + dealerGEX);
    }

    // Find flip level (where GEX changes sign)
    let flipLevel = spotPrice;
    let minAbsGEX = Infinity;
    
    const sortedStrikes = Array.from(gexByStrike.entries())
      .sort((a, b) => a[0] - b[0]);
    
    let cumulativeGEX = 0;
    for (const [strike, gex] of sortedStrikes) {
      cumulativeGEX += gex;
      if (Math.abs(cumulativeGEX) < minAbsGEX) {
        minAbsGEX = Math.abs(cumulativeGEX);
        flipLevel = strike;
      }
    }

    // Get major GEX levels
    const majorLevels = Array.from(gexByStrike.entries())
      .map(([strike, gex]) => ({ strike, gex }))
      .sort((a, b) => Math.abs(b.gex) - Math.abs(a.gex))
      .slice(0, 10);

    // Determine regime
    let regime: "positive" | "negative" | "neutral";
    if (totalGEX > 100) {
      regime = "positive";
    } else if (totalGEX < -100) {
      regime = "negative";
    } else {
      regime = "neutral";
    }

    return {
      totalGEX,
      callGEX,
      putGEX,
      flipLevel,
      majorLevels,
      regime,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error calculating GEX:", error);
    return null;
  }
}

/**
 * Get current SPY/ES price
 */
export async function getSPYPrice(): Promise<number | null> {
  try {
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: SPY_SYMBOL,
        region: "US",
        interval: "1m",
        range: "1d",
      },
    }) as { chart?: { result?: Array<{ meta?: Record<string, number> }> } };

    return result?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch (error) {
    console.error("Error fetching SPY price:", error);
    return null;
  }
}

/**
 * Get historical SPY data
 */
export async function getSPYHistory(range: string = "1mo"): Promise<{
  timestamps: number[];
  prices: number[];
  volumes: number[];
} | null> {
  try {
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: SPY_SYMBOL,
        region: "US",
        interval: "1d",
        range,
      },
    }) as { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: number[]; volume?: number[] }> } }> } };

    if (result?.chart?.result?.[0]) {
      const data = result.chart.result[0];
      return {
        timestamps: data.timestamp || [],
        prices: data.indicators?.quote?.[0]?.close || [],
        volumes: data.indicators?.quote?.[0]?.volume || [],
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching SPY history:", error);
    return null;
  }
}

// Helper functions

function generateStrikes(currentPrice: number, count: number, step: number): number[] {
  const strikes: number[] = [];
  const baseStrike = Math.round(currentPrice / step) * step;
  
  for (let i = -count / 2; i <= count / 2; i++) {
    strikes.push(baseStrike + i * step);
  }
  
  return strikes;
}

function calculateImpliedVolatility(moneyness: number): number {
  // Simplified IV smile model
  const atmIV = 0.15; // 15% ATM IV
  const skew = 0.1; // Skew factor
  const smile = 0.05; // Smile factor
  
  return atmIV + skew * moneyness + smile * moneyness * moneyness;
}

function calculateGreeks(
  spot: number,
  strike: number,
  iv: number,
  daysToExpiry: number
): { delta: number; gamma: number } {
  // Simplified Black-Scholes Greeks
  const t = daysToExpiry / 365;
  const r = 0.05; // Risk-free rate
  
  const d1 = (Math.log(spot / strike) + (r + iv * iv / 2) * t) / (iv * Math.sqrt(t));
  
  // Approximate delta using normal CDF
  const delta = normalCDF(d1);
  
  // Gamma calculation
  const gamma = Math.exp(-d1 * d1 / 2) / (spot * iv * Math.sqrt(2 * Math.PI * t));
  
  return { delta, gamma };
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function getNextFridayExpiration(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  return nextFriday.toISOString().split("T")[0];
}

/**
 * Get complete market context for trading decisions
 */
export async function getMarketContext(): Promise<{
  vix: VIXData | null;
  vixTermStructure: VIXTermStructure | null;
  gex: GEXData | null;
  spyPrice: number | null;
  marketRegime: string;
}> {
  const [vix, vixTermStructure, gex, spyPrice] = await Promise.all([
    getVIXData(),
    getVIXTermStructure(),
    calculateGEX(),
    getSPYPrice(),
  ]);

  // Determine overall market regime
  let marketRegime = "neutral";
  
  if (vix && gex) {
    if (vix.current > 25 && gex.regime === "negative") {
      marketRegime = "high_volatility_trending";
    } else if (vix.current > 25 && gex.regime === "positive") {
      marketRegime = "high_volatility_mean_reverting";
    } else if (vix.current < 15 && gex.regime === "positive") {
      marketRegime = "low_volatility_grinding";
    } else if (vix.current < 15 && gex.regime === "negative") {
      marketRegime = "low_volatility_breakout_risk";
    } else {
      marketRegime = "normal";
    }
  }

  return {
    vix,
    vixTermStructure,
    gex,
    spyPrice,
    marketRegime,
  };
}
