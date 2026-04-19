CREATE TABLE `company_estimate_defaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`overheadPct` int NOT NULL DEFAULT 1000,
	`profitPct` int NOT NULL DEFAULT 1000,
	`contingencyPct` int NOT NULL DEFAULT 500,
	`bondPct` int NOT NULL DEFAULT 150,
	`taxPct` int NOT NULL DEFAULT 0,
	`generalConditionsPct` int NOT NULL DEFAULT 0,
	`customMarkups` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_estimate_defaults_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_estimate_defaults_memberId_unique` UNIQUE(`memberId`)
);
--> statement-breakpoint
CREATE TABLE `estimate_markups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`memberId` int NOT NULL,
	`overheadPct` int NOT NULL DEFAULT 1000,
	`profitPct` int NOT NULL DEFAULT 1000,
	`contingencyPct` int NOT NULL DEFAULT 500,
	`bondPct` int NOT NULL DEFAULT 150,
	`taxPct` int NOT NULL DEFAULT 0,
	`generalConditionsPct` int NOT NULL DEFAULT 0,
	`customMarkups` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estimate_markups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_labor_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`csiDivision` varchar(8),
	`description` varchar(512) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`laborRate` int NOT NULL,
	`crewSize` decimal(5,1),
	`productivity` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_labor_library_id` PRIMARY KEY(`id`)
);
