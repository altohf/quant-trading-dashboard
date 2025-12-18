import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as marketData from "./services/marketData";
import * as databento from "./services/databento";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ TRADING SIGNALS ============
  signals: router({
    latest: publicProcedure.query(async () => {
      const signal = await db.getLatestSignal();
      return signal;
    }),
    
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        signalType: z.string().optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const filters = input ? {
          signalType: input.signalType,
          minConfidence: input.minConfidence,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        } : undefined;
        
        return await db.getSignals(input?.limit ?? 50, input?.offset ?? 0, filters);
      }),
  }),

  // ============ REGIME ============
  regime: router({
    current: publicProcedure.query(async () => {
      return await db.getLatestRegime();
    }),
    
    history: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
      .query(async ({ input }) => {
        return await db.getRegimeHistory(input?.limit ?? 100);
      }),
  }),

  // ============ POSITIONS ============
  positions: router({
    open: publicProcedure.query(async () => {
      return await db.getOpenPositions();
    }),
    
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        status: z.enum(["open", "closed", "cancelled"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getPositions(input?.limit ?? 50, input?.status);
      }),
  }),

  // ============ DAILY STATS ============
  stats: router({
    today: publicProcedure.query(async () => {
      return await db.getTodayStats();
    }),
    
    history: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ input }) => {
        return await db.getDailyStatsHistory(input?.days ?? 30);
      }),
    
    performance: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ input }) => {
        return await db.getPerformanceMetrics(input?.days ?? 30);
      }),
  }),

  // ============ SYSTEM CONFIG ============
  config: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSystemConfig(ctx.user.id);
    }),
    
    update: protectedProcedure
      .input(z.object({
        maxDailyLoss: z.string().optional(),
        maxPositionSize: z.number().optional(),
        maxDailyTrades: z.number().optional(),
        tradingStartTime: z.string().optional(),
        tradingEndTime: z.string().optional(),
        defaultTp: z.number().optional(),
        defaultSl: z.number().optional(),
        notificationsEnabled: z.boolean().optional(),
        telegramEnabled: z.boolean().optional(),
        autoTradeEnabled: z.boolean().optional(),
        riskPerTrade: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertSystemConfig({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),

  // ============ FEATURE IMPORTANCE ============
  features: router({
    importance: publicProcedure.query(async () => {
      return await db.getLatestFeatureImportance();
    }),
  }),

  // ============ OPTIMIZATION SURFACE ============
  optimization: router({
    surface: publicProcedure.query(async () => {
      return await db.getLatestOptimizationSurface();
    }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        unreadOnly: z.boolean().default(false),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getNotifications(ctx.user.id, input?.limit ?? 50, input?.unreadOnly ?? false);
      }),
    
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
    
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ SYSTEM STATUS ============
  systemStatus: router({
    get: publicProcedure.query(async () => {
      const latestSignal = await db.getLatestSignal();
      const latestRegime = await db.getLatestRegime();
      const todayStats = await db.getTodayStats();
      const openPositions = await db.getOpenPositions();
      
      // Calculate system status
      const now = new Date();
      const lastSignalTime = latestSignal?.timestamp ? new Date(latestSignal.timestamp) : null;
      const isOnline = lastSignalTime ? (now.getTime() - lastSignalTime.getTime()) < 5 * 60 * 1000 : false;
      
      // Trading hours check (15:30 - 22:00 CET)
      const hour = now.getUTCHours() + 1; // CET = UTC+1
      const isTradingHours = hour >= 15 && hour < 22;
      
      return {
        isOnline,
        isTradingHours,
        lastSignalTime: lastSignalTime?.toISOString() ?? null,
        currentRegime: latestRegime?.regime ?? "unknown",
        regimeConfidence: latestRegime?.confidence ?? "0",
        todayPnl: todayStats?.netPnl ?? "0",
        todayTrades: todayStats?.totalTrades ?? 0,
        todayWinRate: todayStats?.winRate ?? "0",
        openPositionsCount: openPositions.length,
        maxDrawdown: todayStats?.maxDrawdown ?? "0",
      };
    }),
  }),

  // ============ MARKET DATA (Real-time) ============
  marketData: router({
    // VIX Data
    vix: publicProcedure.query(async () => {
      return await marketData.getVIXData();
    }),
    
    vixTermStructure: publicProcedure.query(async () => {
      return await marketData.getVIXTermStructure();
    }),
    
    // GEX (Gamma Exposure)
    gex: publicProcedure.query(async () => {
      return await marketData.calculateGEX();
    }),
    
    // SPY Price
    spyPrice: publicProcedure.query(async () => {
      return await marketData.getSPYPrice();
    }),
    
    // SPY History
    spyHistory: publicProcedure
      .input(z.object({ range: z.string().default("1mo") }).optional())
      .query(async ({ input }) => {
        return await marketData.getSPYHistory(input?.range ?? "1mo");
      }),
    
    // Complete Market Context
    context: publicProcedure.query(async () => {
      return await marketData.getMarketContext();
    }),
  }),

  // ============ DATABENTO (Futures Data) ============
  databento: router({
    // Status
    status: publicProcedure.query(async () => {
      return await databento.getDatabentoStatus();
    }),
    
    // Current ES Symbol
    currentSymbol: publicProcedure.query(() => {
      return databento.getCurrentESSymbol();
    }),
    
    // ES Bars
    esBars: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        interval: z.enum(["1m", "5m", "15m", "1h", "1d"]).default("1m"),
      }))
      .query(async ({ input }) => {
        return await databento.getESBars(
          new Date(input.startDate),
          new Date(input.endDate),
          input.interval
        );
      }),
    
    // Latest ES Price
    latestPrice: publicProcedure.query(async () => {
      return await databento.getLatestESPrice();
    }),
  }),

  // ============ DEMO DATA (for development) ============
  demo: router({
    seedData: protectedProcedure.mutation(async ({ ctx }) => {
      // This will seed demo data for testing
      const now = new Date();
      
      // Seed some trading signals
      const signalTypes = ["strong_buy", "buy", "hold", "sell", "strong_sell"] as const;
      const regimes = ["trend_up", "trend_down", "mean_reversion", "high_volatility", "low_volatility"] as const;
      
      for (let i = 0; i < 50; i++) {
        const signalDate = new Date(now.getTime() - i * 15 * 60 * 1000); // Every 15 minutes
        await db.insertSignal({
          timestamp: signalDate,
          signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
          confidence: (0.5 + Math.random() * 0.5).toFixed(4),
          regime: regimes[Math.floor(Math.random() * regimes.length)],
          suggestedTp: Math.floor(6 + Math.random() * 6),
          suggestedSl: Math.floor(3 + Math.random() * 4),
          entryPrice: (5000 + Math.random() * 100).toFixed(2),
          executed: Math.random() > 0.5,
        });
      }
      
      // Seed regime history
      for (let i = 0; i < 20; i++) {
        const regimeDate = new Date(now.getTime() - i * 60 * 60 * 1000); // Every hour
        await db.insertRegime({
          timestamp: regimeDate,
          regime: regimes[Math.floor(Math.random() * regimes.length)],
          confidence: (0.7 + Math.random() * 0.3).toFixed(4),
          duration: Math.floor(10 + Math.random() * 50),
          vixLevel: (15 + Math.random() * 10).toFixed(2),
          gexLevel: ((-500 + Math.random() * 1000) * 1000000).toFixed(2),
        });
      }
      
      // Seed feature importance
      const features = [
        { name: "order_flow_imbalance", category: "orderflow" },
        { name: "cumulative_delta", category: "orderflow" },
        { name: "rsi_14", category: "technical" },
        { name: "macd_histogram", category: "technical" },
        { name: "volume_ratio", category: "volume" },
        { name: "vwap_deviation", category: "price" },
        { name: "gex_level", category: "options" },
        { name: "vix_term_structure", category: "options" },
        { name: "regime_duration", category: "regime" },
        { name: "book_imbalance", category: "orderflow" },
      ] as const;
      
      const featureData = features.map((f, idx) => ({
        timestamp: now,
        featureName: f.name,
        importance: ((10 - idx) * 0.1 + Math.random() * 0.05).toFixed(6),
        category: f.category,
        modelType: "ensemble",
      }));
      
      await db.insertFeatureImportance(featureData);
      
      // Seed optimization surface
      const surfaceData = [];
      for (let tp = 4; tp <= 15; tp++) {
        for (let sl = 2; sl <= 10; sl++) {
          surfaceData.push({
            timestamp: now,
            tpTicks: tp,
            slTicks: sl,
            expectedValue: (Math.sin(tp / 5) * Math.cos(sl / 5) * 2 + Math.random() * 0.5).toFixed(4),
            winRate: (0.4 + Math.random() * 0.3).toFixed(4),
            profitFactor: (0.8 + Math.random() * 1.5).toFixed(4),
            sampleSize: Math.floor(100 + Math.random() * 500),
          });
        }
      }
      
      await db.insertOptimizationSurface(surfaceData);
      
      // Seed daily stats
      for (let i = 0; i < 30; i++) {
        const statsDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        statsDate.setHours(0, 0, 0, 0);
        
        const totalTrades = Math.floor(5 + Math.random() * 10);
        const winningTrades = Math.floor(totalTrades * (0.4 + Math.random() * 0.3));
        const pnl = (-500 + Math.random() * 1500).toFixed(2);
        
        await db.upsertDailyStats({
          date: statsDate,
          totalTrades,
          winningTrades,
          losingTrades: totalTrades - winningTrades,
          winRate: (winningTrades / totalTrades).toFixed(4),
          grossPnl: pnl,
          netPnl: (parseFloat(pnl) * 0.95).toFixed(2),
          maxDrawdown: (Math.random() * 500).toFixed(2),
          avgWin: (50 + Math.random() * 100).toFixed(2),
          avgLoss: (30 + Math.random() * 70).toFixed(2),
          largestWin: (100 + Math.random() * 200).toFixed(2),
          largestLoss: (50 + Math.random() * 150).toFixed(2),
        });
      }
      
      // Seed some notifications
      const notificationTypes = ["signal", "risk_alert", "system", "performance"] as const;
      const severities = ["info", "warning", "success"] as const;
      
      for (let i = 0; i < 10; i++) {
        await db.insertNotification({
          userId: ctx.user.id,
          type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
          title: `Notification ${i + 1}`,
          message: `This is a demo notification message #${i + 1}`,
          severity: severities[Math.floor(Math.random() * severities.length)],
          read: Math.random() > 0.5,
        });
      }
      
      return { success: true, message: "Demo data seeded successfully" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
