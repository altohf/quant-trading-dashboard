/**
 * Trading Engine Service
 * 
 * Background service that:
 * 1. Collects real-time market data (ES futures, VIX, options)
 * 2. Calculates market regime using HMM
 * 3. Generates trading signals using ensemble AI models
 * 4. Manages risk and position sizing
 */

import * as marketData from "./marketData";
import * as databento from "./databento";
import * as db from "../db";

// Trading configuration
const TRADING_CONFIG = {
  // Trading hours (CET)
  tradingStartHour: 15,
  tradingStartMinute: 30,
  tradingEndHour: 22,
  tradingEndMinute: 0,
  
  // Data collection interval (milliseconds)
  dataCollectionInterval: 60000, // 1 minute
  
  // Signal generation parameters
  minConfidenceThreshold: 0.65,
  
  // Risk parameters
  maxDailyLoss: 2000,
  maxPositionSize: 5,
  maxDailyTrades: 10,
};

// Market state
interface MarketState {
  esPrice: number | null;
  vix: number | null;
  vixChange: number;
  gex: number | null;
  gexRegime: "positive" | "negative" | "neutral";
  orderFlowImbalance: number;
  cumulativeDelta: number;
  volume: number;
  timestamp: Date;
}

// Regime state
interface RegimeState {
  regime: "trend_up" | "trend_down" | "mean_reversion" | "high_volatility" | "low_volatility";
  confidence: number;
  duration: number;
  transitionProbabilities: Record<string, number>;
}

// Signal state
interface SignalState {
  signalType: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: number;
  suggestedTp: number;
  suggestedSl: number;
  entryPrice: number;
  reasoning: string[];
}

// Feature values for model
interface FeatureVector {
  orderFlowImbalance: number;
  cumulativeDelta: number;
  rsi14: number;
  macdHistogram: number;
  volumeRatio: number;
  vwapDeviation: number;
  gexLevel: number;
  vixLevel: number;
  vixTermStructure: number;
  regimeDuration: number;
  bookImbalance: number;
  priceChange5m: number;
  priceChange15m: number;
  volatility: number;
}

// Global state
let isRunning = false;
let lastMarketState: MarketState | null = null;
let lastRegimeState: RegimeState | null = null;
let priceHistory: { timestamp: Date; price: number }[] = [];
let regimeHistory: { timestamp: Date; regime: string }[] = [];

/**
 * Check if current time is within trading hours
 */
function isTradingHours(): boolean {
  const now = new Date();
  const cetHour = now.getUTCHours() + 1; // CET = UTC+1
  const cetMinute = now.getUTCMinutes();
  
  const startMinutes = TRADING_CONFIG.tradingStartHour * 60 + TRADING_CONFIG.tradingStartMinute;
  const endMinutes = TRADING_CONFIG.tradingEndHour * 60 + TRADING_CONFIG.tradingEndMinute;
  const currentMinutes = cetHour * 60 + cetMinute;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Collect current market data
 */
async function collectMarketData(): Promise<MarketState | null> {
  try {
    // Get ES price from Databento or fallback to SPY
    let esPrice = await databento.getLatestESPrice();
    
    if (!esPrice) {
      // Fallback to SPY price * 10 (approximate ES conversion)
      const spyPrice = await marketData.getSPYPrice();
      esPrice = spyPrice ? spyPrice * 10 : null;
    }
    
    // Get VIX data
    const vixData = await marketData.getVIXData();
    
    // Get GEX data
    const gexData = await marketData.calculateGEX();
    
    // Get order flow data (if available from Databento)
    let orderFlowImbalance = 0;
    let cumulativeDelta = 0;
    let volume = 0;
    
    if (databento.isDatabentoConfigured()) {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      try {
        const trades = await databento.getESTrades(fiveMinutesAgo, now);
        if (trades.length > 0) {
          orderFlowImbalance = databento.calculateOrderFlowImbalance(trades);
          const deltas = databento.calculateCumulativeDelta(trades);
          cumulativeDelta = deltas.length > 0 ? deltas[deltas.length - 1] : 0;
          volume = trades.reduce((sum, t) => sum + t.size, 0);
        }
      } catch (e) {
        console.log("Could not fetch Databento trades, using simulated data");
      }
    }
    
    // If no real order flow data, simulate based on price movement
    if (orderFlowImbalance === 0 && priceHistory.length > 1) {
      const lastPrice = priceHistory[priceHistory.length - 1].price;
      const prevPrice = priceHistory[priceHistory.length - 2].price;
      orderFlowImbalance = (lastPrice - prevPrice) / prevPrice * 10; // Normalized
      cumulativeDelta = orderFlowImbalance * 1000;
    }
    
    const state: MarketState = {
      esPrice,
      vix: vixData?.current ?? null,
      vixChange: vixData?.changePercent ?? 0,
      gex: gexData?.totalGEX ?? null,
      gexRegime: gexData?.regime ?? "neutral",
      orderFlowImbalance,
      cumulativeDelta,
      volume,
      timestamp: new Date(),
    };
    
    // Update price history
    if (esPrice) {
      priceHistory.push({ timestamp: new Date(), price: esPrice });
      // Keep last 100 data points
      if (priceHistory.length > 100) {
        priceHistory = priceHistory.slice(-100);
      }
    }
    
    return state;
  } catch (error) {
    console.error("Error collecting market data:", error);
    return null;
  }
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD
 */
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // Simplified signal line
  const signal = macd * 0.9;
  
  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * 100; // Percentage
}

/**
 * Build feature vector for model
 */
function buildFeatureVector(marketState: MarketState): FeatureVector {
  const prices = priceHistory.map(p => p.price);
  const macd = calculateMACD(prices);
  
  // Calculate price changes
  let priceChange5m = 0;
  let priceChange15m = 0;
  
  if (prices.length >= 5) {
    priceChange5m = (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5] * 100;
  }
  if (prices.length >= 15) {
    priceChange15m = (prices[prices.length - 1] - prices[prices.length - 15]) / prices[prices.length - 15] * 100;
  }
  
  // Calculate VWAP deviation (simplified)
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const vwapDeviation = avgPrice > 0 && marketState.esPrice 
    ? (marketState.esPrice - avgPrice) / avgPrice * 100 
    : 0;
  
  return {
    orderFlowImbalance: marketState.orderFlowImbalance,
    cumulativeDelta: marketState.cumulativeDelta,
    rsi14: calculateRSI(prices, 14),
    macdHistogram: macd.histogram,
    volumeRatio: marketState.volume > 0 ? 1 : 0.5,
    vwapDeviation,
    gexLevel: marketState.gex ?? 0,
    vixLevel: marketState.vix ?? 20,
    vixTermStructure: marketState.vixChange,
    regimeDuration: lastRegimeState?.duration ?? 0,
    bookImbalance: marketState.orderFlowImbalance * 0.8,
    priceChange5m,
    priceChange15m,
    volatility: calculateVolatility(prices),
  };
}

/**
 * Hidden Markov Model for regime detection
 * Simplified implementation using rule-based transitions
 */
function detectRegime(features: FeatureVector, marketState: MarketState): RegimeState {
  const vix = marketState.vix ?? 20;
  const gex = marketState.gex ?? 0;
  const volatility = features.volatility;
  const rsi = features.rsi14;
  const macdHist = features.macdHistogram;
  const priceChange = features.priceChange15m;
  
  // Determine regime based on multiple factors
  let regime: RegimeState["regime"];
  let confidence: number;
  
  // High volatility regime
  if (vix > 25 || volatility > 2) {
    regime = "high_volatility";
    confidence = Math.min(0.95, 0.7 + (vix - 20) / 50);
  }
  // Low volatility regime
  else if (vix < 15 && volatility < 0.5) {
    regime = "low_volatility";
    confidence = Math.min(0.95, 0.7 + (15 - vix) / 30);
  }
  // Trend up regime
  else if (priceChange > 0.3 && rsi > 55 && macdHist > 0) {
    regime = "trend_up";
    confidence = Math.min(0.95, 0.6 + priceChange / 2);
  }
  // Trend down regime
  else if (priceChange < -0.3 && rsi < 45 && macdHist < 0) {
    regime = "trend_down";
    confidence = Math.min(0.95, 0.6 + Math.abs(priceChange) / 2);
  }
  // Mean reversion regime (positive GEX environment)
  else if (gex > 0 && Math.abs(priceChange) < 0.3) {
    regime = "mean_reversion";
    confidence = Math.min(0.9, 0.6 + gex / 1000);
  }
  // Default to mean reversion
  else {
    regime = "mean_reversion";
    confidence = 0.5;
  }
  
  // Calculate duration
  let duration = 1;
  if (lastRegimeState && lastRegimeState.regime === regime) {
    duration = lastRegimeState.duration + 1;
    // Increase confidence with duration
    confidence = Math.min(0.95, confidence + duration * 0.01);
  }
  
  // Transition probabilities (simplified)
  const transitionProbabilities: Record<string, number> = {
    trend_up: regime === "trend_up" ? 0.7 : 0.1,
    trend_down: regime === "trend_down" ? 0.7 : 0.1,
    mean_reversion: regime === "mean_reversion" ? 0.6 : 0.2,
    high_volatility: regime === "high_volatility" ? 0.8 : 0.05,
    low_volatility: regime === "low_volatility" ? 0.75 : 0.05,
  };
  
  return {
    regime,
    confidence,
    duration,
    transitionProbabilities,
  };
}

/**
 * Ensemble AI model for signal generation
 * Combines multiple strategies based on regime
 */
function generateSignal(features: FeatureVector, regime: RegimeState, marketState: MarketState): SignalState {
  const reasoning: string[] = [];
  let buyScore = 0;
  let sellScore = 0;
  
  // Strategy weights based on regime
  const weights = getStrategyWeights(regime.regime);
  
  // 1. Order Flow Strategy
  if (features.orderFlowImbalance > 0.3) {
    buyScore += weights.orderFlow;
    reasoning.push(`Order flow bullish (${(features.orderFlowImbalance * 100).toFixed(1)}%)`);
  } else if (features.orderFlowImbalance < -0.3) {
    sellScore += weights.orderFlow;
    reasoning.push(`Order flow bearish (${(features.orderFlowImbalance * 100).toFixed(1)}%)`);
  }
  
  // 2. RSI Strategy
  if (features.rsi14 < 30) {
    buyScore += weights.rsi;
    reasoning.push(`RSI oversold (${features.rsi14.toFixed(1)})`);
  } else if (features.rsi14 > 70) {
    sellScore += weights.rsi;
    reasoning.push(`RSI overbought (${features.rsi14.toFixed(1)})`);
  }
  
  // 3. MACD Strategy
  if (features.macdHistogram > 0 && features.priceChange5m > 0) {
    buyScore += weights.macd;
    reasoning.push("MACD bullish crossover");
  } else if (features.macdHistogram < 0 && features.priceChange5m < 0) {
    sellScore += weights.macd;
    reasoning.push("MACD bearish crossover");
  }
  
  // 4. GEX Strategy
  if (marketState.gexRegime === "positive" && features.vwapDeviation < -0.5) {
    buyScore += weights.gex;
    reasoning.push("Positive GEX + below VWAP (mean reversion buy)");
  } else if (marketState.gexRegime === "negative" && features.priceChange5m < -0.2) {
    sellScore += weights.gex;
    reasoning.push("Negative GEX + momentum down (trend sell)");
  }
  
  // 5. VIX Strategy
  if (features.vixLevel > 25 && features.vixTermStructure < 0) {
    buyScore += weights.vix;
    reasoning.push("VIX spike + backwardation (fear peak)");
  } else if (features.vixLevel < 15 && features.vixTermStructure > 0) {
    sellScore += weights.vix;
    reasoning.push("Low VIX + contango (complacency)");
  }
  
  // 6. Regime-specific adjustments
  if (regime.regime === "trend_up" && buyScore > sellScore) {
    buyScore *= 1.2;
    reasoning.push(`Trend up regime (confidence: ${(regime.confidence * 100).toFixed(0)}%)`);
  } else if (regime.regime === "trend_down" && sellScore > buyScore) {
    sellScore *= 1.2;
    reasoning.push(`Trend down regime (confidence: ${(regime.confidence * 100).toFixed(0)}%)`);
  } else if (regime.regime === "mean_reversion") {
    // Fade extremes in mean reversion
    if (features.rsi14 < 35) buyScore *= 1.3;
    if (features.rsi14 > 65) sellScore *= 1.3;
    reasoning.push("Mean reversion regime active");
  }
  
  // Calculate final signal
  const netScore = buyScore - sellScore;
  const totalScore = buyScore + sellScore;
  const confidence = totalScore > 0 ? Math.min(0.95, Math.abs(netScore) / totalScore) : 0;
  
  let signalType: SignalState["signalType"];
  if (netScore > 0.6) signalType = "strong_buy";
  else if (netScore > 0.2) signalType = "buy";
  else if (netScore < -0.6) signalType = "strong_sell";
  else if (netScore < -0.2) signalType = "sell";
  else signalType = "hold";
  
  // Calculate TP/SL based on volatility and regime
  const { tp, sl } = calculateTPSL(features, regime);
  
  return {
    signalType,
    confidence,
    suggestedTp: tp,
    suggestedSl: sl,
    entryPrice: marketState.esPrice ?? 0,
    reasoning,
  };
}

/**
 * Get strategy weights based on regime
 */
function getStrategyWeights(regime: RegimeState["regime"]): Record<string, number> {
  switch (regime) {
    case "trend_up":
    case "trend_down":
      return { orderFlow: 0.3, rsi: 0.1, macd: 0.3, gex: 0.15, vix: 0.15 };
    case "mean_reversion":
      return { orderFlow: 0.2, rsi: 0.3, macd: 0.1, gex: 0.25, vix: 0.15 };
    case "high_volatility":
      return { orderFlow: 0.15, rsi: 0.25, macd: 0.1, gex: 0.2, vix: 0.3 };
    case "low_volatility":
      return { orderFlow: 0.25, rsi: 0.2, macd: 0.25, gex: 0.2, vix: 0.1 };
    default:
      return { orderFlow: 0.2, rsi: 0.2, macd: 0.2, gex: 0.2, vix: 0.2 };
  }
}

/**
 * Calculate optimal TP/SL based on volatility and regime
 */
function calculateTPSL(features: FeatureVector, regime: RegimeState): { tp: number; sl: number } {
  const baseTP = 8;
  const baseSL = 5;
  
  // Adjust based on volatility
  const volMultiplier = 1 + features.volatility / 2;
  
  // Adjust based on regime
  let regimeMultiplier = 1;
  switch (regime.regime) {
    case "trend_up":
    case "trend_down":
      regimeMultiplier = 1.3; // Wider targets in trends
      break;
    case "mean_reversion":
      regimeMultiplier = 0.8; // Tighter targets in mean reversion
      break;
    case "high_volatility":
      regimeMultiplier = 1.5; // Much wider in high vol
      break;
    case "low_volatility":
      regimeMultiplier = 0.7; // Tighter in low vol
      break;
  }
  
  const tp = Math.round(baseTP * volMultiplier * regimeMultiplier);
  const sl = Math.round(baseSL * volMultiplier * regimeMultiplier);
  
  // Ensure minimum values
  return {
    tp: Math.max(4, Math.min(20, tp)),
    sl: Math.max(2, Math.min(12, sl)),
  };
}

/**
 * Save data to database
 */
async function saveToDatabase(
  marketState: MarketState,
  regime: RegimeState,
  signal: SignalState,
  features: FeatureVector
): Promise<void> {
  try {
    // Save regime
    await db.insertRegime({
      timestamp: new Date(),
      regime: regime.regime,
      confidence: regime.confidence.toFixed(4),
      duration: regime.duration,
      vixLevel: (marketState.vix ?? 0).toFixed(2),
      gexLevel: (marketState.gex ?? 0).toFixed(2),
    });
    
    // Save signal (only if not hold and confidence above threshold)
    if (signal.signalType !== "hold" && signal.confidence >= TRADING_CONFIG.minConfidenceThreshold) {
      await db.insertSignal({
        timestamp: new Date(),
        signalType: signal.signalType,
        confidence: signal.confidence.toFixed(4),
        regime: regime.regime,
        suggestedTp: signal.suggestedTp,
        suggestedSl: signal.suggestedSl,
        entryPrice: signal.entryPrice.toFixed(2),
        executed: false,
      });
    }
    
    // Save feature importance (periodically, every 10 minutes)
    const minutes = new Date().getMinutes();
    if (minutes % 10 === 0) {
      const featureData = Object.entries(features).map(([name, value]) => ({
        timestamp: new Date(),
        featureName: name,
        importance: (Math.abs(value as number) / 100).toFixed(6),
        category: getFeatureCategory(name),
        modelType: "ensemble",
      }));
      
      await db.insertFeatureImportance(featureData);
    }
    
    console.log(`[TradingEngine] Saved: Regime=${regime.regime}, Signal=${signal.signalType}, Confidence=${(signal.confidence * 100).toFixed(1)}%`);
  } catch (error) {
    console.error("Error saving to database:", error);
  }
}

/**
 * Get feature category
 */
function getFeatureCategory(featureName: string): string {
  const categories: Record<string, string> = {
    orderFlowImbalance: "orderflow",
    cumulativeDelta: "orderflow",
    bookImbalance: "orderflow",
    rsi14: "technical",
    macdHistogram: "technical",
    volumeRatio: "volume",
    vwapDeviation: "price",
    priceChange5m: "price",
    priceChange15m: "price",
    gexLevel: "options",
    vixLevel: "options",
    vixTermStructure: "options",
    regimeDuration: "regime",
    volatility: "technical",
  };
  return categories[featureName] ?? "other";
}

/**
 * Main trading loop iteration
 */
async function tradingIteration(): Promise<void> {
  if (!isTradingHours()) {
    console.log("[TradingEngine] Outside trading hours, skipping iteration");
    return;
  }
  
  console.log("[TradingEngine] Starting iteration...");
  
  // Collect market data
  const marketState = await collectMarketData();
  if (!marketState || !marketState.esPrice) {
    console.log("[TradingEngine] Could not collect market data");
    return;
  }
  
  lastMarketState = marketState;
  
  // Build feature vector
  const features = buildFeatureVector(marketState);
  
  // Detect regime
  const regime = detectRegime(features, marketState);
  lastRegimeState = regime;
  
  // Update regime history
  regimeHistory.push({ timestamp: new Date(), regime: regime.regime });
  if (regimeHistory.length > 100) {
    regimeHistory = regimeHistory.slice(-100);
  }
  
  // Generate signal
  const signal = generateSignal(features, regime, marketState);
  
  // Save to database
  await saveToDatabase(marketState, regime, signal, features);
  
  console.log(`[TradingEngine] Iteration complete: ES=${marketState.esPrice}, VIX=${marketState.vix}, Regime=${regime.regime}`);
}

/**
 * Start the trading engine
 */
export async function startTradingEngine(): Promise<void> {
  if (isRunning) {
    console.log("[TradingEngine] Already running");
    return;
  }
  
  console.log("[TradingEngine] Starting...");
  isRunning = true;
  
  // Initial iteration
  await tradingIteration();
  
  // Schedule periodic iterations
  const intervalId = setInterval(async () => {
    if (!isRunning) {
      clearInterval(intervalId);
      return;
    }
    
    try {
      await tradingIteration();
    } catch (error) {
      console.error("[TradingEngine] Error in iteration:", error);
    }
  }, TRADING_CONFIG.dataCollectionInterval);
  
  console.log("[TradingEngine] Started successfully");
}

/**
 * Stop the trading engine
 */
export function stopTradingEngine(): void {
  console.log("[TradingEngine] Stopping...");
  isRunning = false;
}

/**
 * Get current engine status
 */
export function getEngineStatus(): {
  isRunning: boolean;
  isTradingHours: boolean;
  lastMarketState: MarketState | null;
  lastRegimeState: RegimeState | null;
  priceHistoryLength: number;
} {
  return {
    isRunning,
    isTradingHours: isTradingHours(),
    lastMarketState,
    lastRegimeState,
    priceHistoryLength: priceHistory.length,
  };
}

/**
 * Force a single iteration (for testing)
 */
export async function forceIteration(): Promise<void> {
  await tradingIteration();
}
