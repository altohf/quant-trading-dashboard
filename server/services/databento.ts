/**
 * Databento Integration Module
 * 
 * Provides real-time and historical data access for CME futures (ES, NQ, etc.)
 * using the Databento API.
 */

import { ENV } from "../_core/env";

const DATABENTO_API_KEY = process.env.DATABENTO_API_KEY || "";
const DATABENTO_BASE_URL = "https://hist.databento.com/v0";

// CME Globex dataset for ES futures
const CME_DATASET = "GLBX.MDP3";

interface DatabentoBar {
  ts_event: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DatabentoTrade {
  ts_event: number;
  price: number;
  size: number;
  side: string;
}

interface DatabentoQuote {
  ts_event: number;
  bid_px: number;
  ask_px: number;
  bid_sz: number;
  ask_sz: number;
}

/**
 * Get authorization header for Databento API
 */
function getAuthHeader(): string {
  return `Basic ${Buffer.from(DATABENTO_API_KEY + ":").toString("base64")}`;
}

/**
 * Make a request to Databento API
 */
async function databentoRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${DATABENTO_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": getAuthHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Databento API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get available datasets from Databento
 */
export async function getAvailableDatasets(): Promise<string[]> {
  return databentoRequest<string[]>("/metadata.list_datasets");
}

/**
 * Get available symbols for CME dataset
 */
export async function getCMESymbols(): Promise<string[]> {
  return databentoRequest<string[]>("/metadata.list_symbols", {
    dataset: CME_DATASET,
  });
}

/**
 * Get the front-month ES futures symbol
 * ES futures follow the pattern: ES + Month Code + Year
 * Month codes: H=Mar, M=Jun, U=Sep, Z=Dec
 */
export function getCurrentESSymbol(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear() % 100; // Last 2 digits
  
  // Determine the current front-month contract
  // Contracts expire on 3rd Friday of contract month
  let contractMonth: string;
  let contractYear = year;
  
  if (month < 2 || (month === 2 && now.getDate() < 15)) {
    contractMonth = "H"; // March
  } else if (month < 5 || (month === 5 && now.getDate() < 15)) {
    contractMonth = "M"; // June
  } else if (month < 8 || (month === 8 && now.getDate() < 15)) {
    contractMonth = "U"; // September
  } else if (month < 11 || (month === 11 && now.getDate() < 15)) {
    contractMonth = "Z"; // December
  } else {
    contractMonth = "H"; // Next year March
    contractYear = (year + 1) % 100;
  }
  
  return `ES${contractMonth}${contractYear}`;
}

/**
 * Get historical OHLCV bars for ES futures
 */
export async function getESBars(
  startDate: Date,
  endDate: Date,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" = "1m"
): Promise<DatabentoBar[]> {
  const symbol = getCurrentESSymbol();
  
  // Map interval to Databento schema
  const schemaMap: Record<string, string> = {
    "1m": "ohlcv-1m",
    "5m": "ohlcv-5m", 
    "15m": "ohlcv-15m",
    "1h": "ohlcv-1h",
    "1d": "ohlcv-1d",
  };

  const params = {
    dataset: CME_DATASET,
    symbols: symbol,
    schema: schemaMap[interval],
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    encoding: "json",
  };

  try {
    const response = await databentoRequest<DatabentoBar[]>("/timeseries.get_range", params);
    return response;
  } catch (error) {
    console.error("Error fetching ES bars from Databento:", error);
    return [];
  }
}

/**
 * Get recent trades for ES futures (for order flow analysis)
 */
export async function getESTrades(
  startDate: Date,
  endDate: Date
): Promise<DatabentoTrade[]> {
  const symbol = getCurrentESSymbol();

  const params = {
    dataset: CME_DATASET,
    symbols: symbol,
    schema: "trades",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    encoding: "json",
  };

  try {
    const response = await databentoRequest<DatabentoTrade[]>("/timeseries.get_range", params);
    return response;
  } catch (error) {
    console.error("Error fetching ES trades from Databento:", error);
    return [];
  }
}

/**
 * Get BBO (Best Bid/Offer) quotes for ES futures
 */
export async function getESQuotes(
  startDate: Date,
  endDate: Date
): Promise<DatabentoQuote[]> {
  const symbol = getCurrentESSymbol();

  const params = {
    dataset: CME_DATASET,
    symbols: symbol,
    schema: "bbo-1s",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    encoding: "json",
  };

  try {
    const response = await databentoRequest<DatabentoQuote[]>("/timeseries.get_range", params);
    return response;
  } catch (error) {
    console.error("Error fetching ES quotes from Databento:", error);
    return [];
  }
}

/**
 * Calculate Order Flow Imbalance from trades
 */
export function calculateOrderFlowImbalance(trades: DatabentoTrade[]): number {
  if (trades.length === 0) return 0;

  let buyVolume = 0;
  let sellVolume = 0;

  for (const trade of trades) {
    if (trade.side === "B" || trade.side === "A") {
      buyVolume += trade.size;
    } else {
      sellVolume += trade.size;
    }
  }

  const totalVolume = buyVolume + sellVolume;
  if (totalVolume === 0) return 0;

  return (buyVolume - sellVolume) / totalVolume;
}

/**
 * Calculate Cumulative Delta from trades
 */
export function calculateCumulativeDelta(trades: DatabentoTrade[]): number[] {
  const delta: number[] = [];
  let cumulative = 0;

  for (const trade of trades) {
    const sign = trade.side === "B" || trade.side === "A" ? 1 : -1;
    cumulative += sign * trade.size;
    delta.push(cumulative);
  }

  return delta;
}

/**
 * Get latest ES price (from most recent bar)
 */
export async function getLatestESPrice(): Promise<number | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    const bars = await getESBars(oneHourAgo, now, "1m");
    if (bars.length > 0) {
      return bars[bars.length - 1].close;
    }
    return null;
  } catch (error) {
    console.error("Error getting latest ES price:", error);
    return null;
  }
}

/**
 * Check if Databento API is available and configured
 */
export function isDatabentoConfigured(): boolean {
  return !!DATABENTO_API_KEY && DATABENTO_API_KEY.startsWith("db-");
}

/**
 * Get Databento API status
 */
export async function getDatabentoStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  currentSymbol: string;
  datasets: string[];
}> {
  const configured = isDatabentoConfigured();
  
  if (!configured) {
    return {
      configured: false,
      connected: false,
      currentSymbol: getCurrentESSymbol(),
      datasets: [],
    };
  }

  try {
    const datasets = await getAvailableDatasets();
    return {
      configured: true,
      connected: true,
      currentSymbol: getCurrentESSymbol(),
      datasets,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      currentSymbol: getCurrentESSymbol(),
      datasets: [],
    };
  }
}
