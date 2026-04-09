CREATE TABLE `activity_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`activityId` int NOT NULL,
	`resourceId` int NOT NULL,
	`unitsPerDay` decimal(10,2) NOT NULL DEFAULT '8.00',
	`costRateOverride` int,
	`budgetedCost` int NOT NULL DEFAULT 0,
	`actualCost` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activity_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`parentId` int,
	`budget` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cost_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`resourceType` enum('labor','equipment','material','subcontractor') NOT NULL DEFAULT 'labor',
	`unit` varchar(32) NOT NULL DEFAULT 'hr',
	`costRate` int NOT NULL DEFAULT 0,
	`maxUnitsPerDay` decimal(10,2) NOT NULL DEFAULT '8.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_resources_id` PRIMARY KEY(`id`)
);
