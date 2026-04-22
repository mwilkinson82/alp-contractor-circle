CREATE TABLE `expanded_cost_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`costItemId` varchar(128) NOT NULL,
	`csiDivision` varchar(8) NOT NULL,
	`csiCode` varchar(16) NOT NULL,
	`description` varchar(512) NOT NULL,
	`unit` varchar(16) NOT NULL,
	`materialCost` int NOT NULL DEFAULT 0,
	`category` varchar(64) NOT NULL,
	`keywords` json,
	`excludeKeywords` json,
	`synonyms` json,
	`isOriginal` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expanded_cost_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expanded_labor_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laborItemId` varchar(128) NOT NULL,
	`csiDivision` varchar(8) NOT NULL,
	`csiCode` varchar(16) NOT NULL,
	`description` varchar(512) NOT NULL,
	`unit` varchar(16) NOT NULL,
	`baseLaborCost` int NOT NULL DEFAULT 0,
	`crewSize` int NOT NULL DEFAULT 2,
	`productivity` int NOT NULL DEFAULT 100,
	`category` varchar(64) NOT NULL,
	`synonyms` json,
	`isOriginal` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expanded_labor_library_id` PRIMARY KEY(`id`)
);
