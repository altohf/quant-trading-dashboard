import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  tradingSignals, InsertTradingSignal, TradingSignal,
  regimeHistory, InsertRegimeHistory,
  positions, InsertPosition,
  dailyStats, InsertDailyStats,
  systemConfig, InsertSystemConfig,
  featureImportance, InsertFeatureImportance,
  optimizationSurface, InsertOptimizationSurface,
  notifications, InsertNotification
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ TRADING SIGNALS QUERIES ============
export async function getLatestSignal() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(tradingSignals)
    .orderBy(desc(tradingSignals.timestamp))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getSignals(limit = 50, offset = 0, filters?: {
  signalType?: string;
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.signalType) {
    conditions.push(eq(tradingSignals.signalType, filters.signalType as any));
  }
  if (filters?.minConfidence) {
    conditions.push(gte(tradingSignals.confidence, filters.minConfidence.toString()));
  }
  if (filters?.startDate) {
    conditions.push(gte(tradingSignals.timestamp, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(tradingSignals.timestamp, filters.endDate));
  }
  
  const query = conditions.length > 0
    ? db.select().from(tradingSignals).where(and(...conditions))
    : db.select().from(tradingSignals);
  
  return await query.orderBy(desc(tradingSignals.timestamp)).limit(limit).offset(offset);
}

export async function insertSignal(signal: InsertTradingSignal) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(tradingSignals).values(signal);
  return result;
}

// ============ REGIME HISTORY QUERIES ============
export async function getLatestRegime() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(regimeHistory)
    .orderBy(desc(regimeHistory.timestamp))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getRegimeHistory(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(regimeHistory)
    .orderBy(desc(regimeHistory.timestamp))
    .limit(limit);
}

export async function insertRegime(regime: InsertRegimeHistory) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(regimeHistory).values(regime);
}

// ============ POSITIONS QUERIES ============
export async function getOpenPositions() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(positions)
    .where(eq(positions.status, "open"))
    .orderBy(desc(positions.openedAt));
}

export async function getPositions(limit = 50, status?: "open" | "closed" | "cancelled") {
  const db = await getDb();
  if (!db) return [];
  
  const query = status
    ? db.select().from(positions).where(eq(positions.status, status))
    : db.select().from(positions);
  
  return await query.orderBy(desc(positions.openedAt)).limit(limit);
}

export async function insertPosition(position: InsertPosition) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(positions).values(position);
}

export async function updatePosition(id: number, updates: Partial<InsertPosition>) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.update(positions).set(updates).where(eq(positions.id, id));
}

// ============ DAILY STATS QUERIES ============
export async function getTodayStats() {
  const db = await getDb();
  if (!db) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await db.select().from(dailyStats)
    .where(gte(dailyStats.date, today))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getDailyStatsHistory(days = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await db.select().from(dailyStats)
    .where(gte(dailyStats.date, startDate))
    .orderBy(desc(dailyStats.date));
}

export async function upsertDailyStats(stats: InsertDailyStats) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(dailyStats).values(stats).onDuplicateKeyUpdate({
    set: stats
  });
}

// ============ SYSTEM CONFIG QUERIES ============
export async function getSystemConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(systemConfig)
    .where(eq(systemConfig.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertSystemConfig(config: InsertSystemConfig) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(systemConfig).values(config).onDuplicateKeyUpdate({
    set: config
  });
}

// ============ FEATURE IMPORTANCE QUERIES ============
export async function getLatestFeatureImportance() {
  const db = await getDb();
  if (!db) return [];
  
  // Get the latest timestamp
  const latestResult = await db.select({ timestamp: featureImportance.timestamp })
    .from(featureImportance)
    .orderBy(desc(featureImportance.timestamp))
    .limit(1);
  
  if (latestResult.length === 0) return [];
  
  const latestTimestamp = latestResult[0].timestamp;
  
  return await db.select().from(featureImportance)
    .where(eq(featureImportance.timestamp, latestTimestamp))
    .orderBy(desc(featureImportance.importance));
}

export async function insertFeatureImportance(features: InsertFeatureImportance[]) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(featureImportance).values(features);
}

// ============ OPTIMIZATION SURFACE QUERIES ============
export async function getLatestOptimizationSurface() {
  const db = await getDb();
  if (!db) return [];
  
  // Get the latest timestamp
  const latestResult = await db.select({ timestamp: optimizationSurface.timestamp })
    .from(optimizationSurface)
    .orderBy(desc(optimizationSurface.timestamp))
    .limit(1);
  
  if (latestResult.length === 0) return [];
  
  const latestTimestamp = latestResult[0].timestamp;
  
  return await db.select().from(optimizationSurface)
    .where(eq(optimizationSurface.timestamp, latestTimestamp));
}

export async function insertOptimizationSurface(data: InsertOptimizationSurface[]) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(optimizationSurface).values(data);
}

// ============ NOTIFICATIONS QUERIES ============
export async function getNotifications(userId: number, limit = 50, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }
  
  return await db.select().from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function insertNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.insert(notifications).values(notification);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
}

// ============ AGGREGATED STATS ============
export async function getPerformanceMetrics(days = 30) {
  const db = await getDb();
  if (!db) return null;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await db.select().from(dailyStats)
    .where(gte(dailyStats.date, startDate))
    .orderBy(dailyStats.date);
  
  if (stats.length === 0) return null;
  
  const totalTrades = stats.reduce((sum, s) => sum + s.totalTrades, 0);
  const winningTrades = stats.reduce((sum, s) => sum + s.winningTrades, 0);
  const totalPnl = stats.reduce((sum, s) => sum + parseFloat(s.netPnl || "0"), 0);
  
  return {
    totalTrades,
    winningTrades,
    losingTrades: totalTrades - winningTrades,
    winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
    totalPnl,
    avgDailyPnl: totalPnl / stats.length,
    dailyStats: stats
  };
}
