CREATE TABLE `daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`totalTrades` int NOT NULL DEFAULT 0,
	`winningTrades` int NOT NULL DEFAULT 0,
	`losingTrades` int NOT NULL DEFAULT 0,
	`winRate` decimal(5,4),
	`grossPnl` decimal(12,2) NOT NULL DEFAULT '0',
	`netPnl` decimal(12,2) NOT NULL DEFAULT '0',
	`maxDrawdown` decimal(12,2) NOT NULL DEFAULT '0',
	`sharpeRatio` decimal(6,4),
	`avgWin` decimal(12,2),
	`avgLoss` decimal(12,2),
	`largestWin` decimal(12,2),
	`largestLoss` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_importance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`featureName` varchar(128) NOT NULL,
	`importance` decimal(10,6) NOT NULL,
	`category` enum('price','volume','orderflow','options','technical','regime') NOT NULL,
	`modelType` varchar(64) NOT NULL,
	CONSTRAINT `feature_importance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('signal','risk_alert','system','performance','error') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`read` boolean NOT NULL DEFAULT false,
	`data` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optimization_surface` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`tpTicks` int NOT NULL,
	`slTicks` int NOT NULL,
	`expectedValue` decimal(10,4) NOT NULL,
	`winRate` decimal(5,4),
	`profitFactor` decimal(8,4),
	`sampleSize` int,
	CONSTRAINT `optimization_surface_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signalId` int,
	`direction` enum('long','short') NOT NULL,
	`entryPrice` decimal(10,2) NOT NULL,
	`exitPrice` decimal(10,2),
	`quantity` int NOT NULL,
	`stopLoss` decimal(10,2) NOT NULL,
	`takeProfit` decimal(10,2) NOT NULL,
	`status` enum('open','closed','cancelled') NOT NULL DEFAULT 'open',
	`pnl` decimal(12,2),
	`pnlPercent` decimal(8,4),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`closeReason` enum('tp_hit','sl_hit','manual','timeout','signal'),
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regime_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`regime` enum('trend_up','trend_down','mean_reversion','high_volatility','low_volatility') NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`duration` int,
	`vixLevel` decimal(6,2),
	`gexLevel` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regime_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`maxDailyLoss` decimal(12,2) NOT NULL DEFAULT '2000',
	`maxPositionSize` int NOT NULL DEFAULT 5,
	`maxDailyTrades` int NOT NULL DEFAULT 10,
	`tradingStartTime` varchar(8) NOT NULL DEFAULT '15:30',
	`tradingEndTime` varchar(8) NOT NULL DEFAULT '22:00',
	`defaultTp` int NOT NULL DEFAULT 8,
	`defaultSl` int NOT NULL DEFAULT 5,
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	`telegramEnabled` boolean NOT NULL DEFAULT false,
	`autoTradeEnabled` boolean NOT NULL DEFAULT false,
	`riskPerTrade` decimal(5,4) NOT NULL DEFAULT '0.01',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`signalType` enum('strong_buy','buy','hold','sell','strong_sell') NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`regime` enum('trend_up','trend_down','mean_reversion','high_volatility','low_volatility') NOT NULL,
	`suggestedTp` int NOT NULL,
	`suggestedSl` int NOT NULL,
	`entryPrice` decimal(10,2),
	`features` json,
	`modelPredictions` json,
	`executed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trading_signals_id` PRIMARY KEY(`id`)
);
