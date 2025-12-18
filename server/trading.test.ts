import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Trading API", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("systemStatus.get", () => {
    it("returns system status with required fields", async () => {
      const result = await caller.systemStatus.get();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("isOnline");
      expect(result).toHaveProperty("isTradingHours");
      expect(result).toHaveProperty("currentRegime");
      expect(result).toHaveProperty("todayPnl");
      expect(result).toHaveProperty("todayTrades");
      expect(typeof result.isOnline).toBe("boolean");
      expect(typeof result.isTradingHours).toBe("boolean");
    });
  });

  describe("signals.latest", () => {
    it("returns latest signal or null", async () => {
      const result = await caller.signals.latest();
      
      // Can be null if no signals exist
      if (result !== null) {
        expect(result).toHaveProperty("signalType");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("regime");
      }
    });
  });

  describe("signals.list", () => {
    it("returns array of signals with pagination", async () => {
      const result = await caller.signals.list({ limit: 10, offset: 0 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
      
      if (result.length > 0) {
        const signal = result[0];
        expect(signal).toHaveProperty("id");
        expect(signal).toHaveProperty("signalType");
        expect(signal).toHaveProperty("confidence");
      }
    });

    it("filters by signal type", async () => {
      const result = await caller.signals.list({ 
        limit: 10, 
        offset: 0,
        signalType: "buy" 
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(signal => {
        expect(signal.signalType).toBe("buy");
      });
    });

    it("filters by minimum confidence", async () => {
      const minConfidence = 0.7;
      const result = await caller.signals.list({ 
        limit: 10, 
        offset: 0,
        minConfidence 
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(signal => {
        expect(parseFloat(signal.confidence)).toBeGreaterThanOrEqual(minConfidence);
      });
    });
  });

  describe("regime.current", () => {
    it("returns current regime or null", async () => {
      const result = await caller.regime.current();
      
      if (result !== null) {
        expect(result).toHaveProperty("regime");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("duration");
      }
    });
  });

  describe("regime.history", () => {
    it("returns array of regime transitions", async () => {
      const result = await caller.regime.history({ limit: 10 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe("optimization.surface", () => {
    it("returns optimization surface data", async () => {
      const result = await caller.optimization.surface();
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const point = result[0];
        expect(point).toHaveProperty("tpTicks");
        expect(point).toHaveProperty("slTicks");
        expect(point).toHaveProperty("expectedValue");
        expect(point).toHaveProperty("winRate");
      }
    });
  });

  describe("stats.today", () => {
    it("returns today's statistics or null", async () => {
      const result = await caller.stats.today();
      
      if (result !== null) {
        expect(result).toHaveProperty("totalTrades");
        expect(result).toHaveProperty("winRate");
        expect(result).toHaveProperty("netPnl");
      }
    });
  });

  describe("stats.history", () => {
    it("returns array of daily stats", async () => {
      const result = await caller.stats.history({ days: 30 });
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const day = result[0];
        expect(day).toHaveProperty("date");
        expect(day).toHaveProperty("netPnl");
      }
    });
  });

  describe("stats.performance", () => {
    it("returns performance metrics", async () => {
      const result = await caller.stats.performance({ days: 30 });
      
      if (result !== null) {
        expect(result).toHaveProperty("totalPnl");
        expect(result).toHaveProperty("winRate");
        expect(result).toHaveProperty("totalTrades");
        expect(result).toHaveProperty("dailyStats");
      }
    });
  });

  describe("features.importance", () => {
    it("returns feature importance rankings", async () => {
      const result = await caller.features.importance();
      
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const feature = result[0];
        expect(feature).toHaveProperty("featureName");
        expect(feature).toHaveProperty("importance");
        expect(feature).toHaveProperty("category");
      }
    });
  });

  describe("config.get", () => {
    it("returns user config", async () => {
      const result = await caller.config.get();
      
      if (result !== null) {
        expect(result).toHaveProperty("maxDailyLoss");
        expect(result).toHaveProperty("defaultTp");
        expect(result).toHaveProperty("defaultSl");
        expect(result).toHaveProperty("tradingStartTime");
        expect(result).toHaveProperty("tradingEndTime");
      }
    });
  });

  describe("config.update", () => {
    it("updates user config successfully", async () => {
      const newConfig = {
        maxDailyLoss: "2500",
        riskPerTrade: "1.5",
        defaultTp: 10,
        defaultSl: 6,
      };

      const result = await caller.config.update(newConfig);
      
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("positions.open", () => {
    it("returns array of open positions", async () => {
      const result = await caller.positions.open();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("notifications.list", () => {
    it("returns array of notifications", async () => {
      const result = await caller.notifications.list({ limit: 10, unreadOnly: false });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });
});
