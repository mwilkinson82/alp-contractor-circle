CREATE TABLE `activity_productivity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`csiDivision` varchar(8),
	`description` varchar(512) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`crewId` int,
	`productivityPerCrewHr` decimal(10,2) NOT NULL,
	`source` varchar(32) DEFAULT 'rs_means',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activity_productivity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `burden_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`laborType` varchar(16) NOT NULL,
	`tradeName` varchar(128),
	`ficaPct` int NOT NULL DEFAULT 765,
	`futaPct` int NOT NULL DEFAULT 60,
	`sutaPct` int NOT NULL DEFAULT 270,
	`workersCompPct` int NOT NULL DEFAULT 800,
	`generalLiabilityPct` int NOT NULL DEFAULT 200,
	`healthInsuranceCentsPerHr` int NOT NULL DEFAULT 850,
	`pensionPct` int NOT NULL DEFAULT 300,
	`vacationPct` int NOT NULL DEFAULT 400,
	`trainingPct` int NOT NULL DEFAULT 0,
	`unionFringeCentsPerHr` int NOT NULL DEFAULT 0,
	`otherCentsPerHr` int NOT NULL DEFAULT 0,
	`otherDescription` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `burden_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crew_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`crewName` varchar(128) NOT NULL,
	`laborType` varchar(16) NOT NULL,
	`crewMembers` text NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crew_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trade_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`tradeName` varchar(128) NOT NULL,
	`csiDivision` varchar(8),
	`classification` varchar(32) NOT NULL,
	`laborType` varchar(16) NOT NULL,
	`baseWageCents` int NOT NULL,
	`regionCode` varchar(32),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trade_rates_id` PRIMARY KEY(`id`)
);
