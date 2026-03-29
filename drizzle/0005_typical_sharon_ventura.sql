CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`activityId` varchar(32) NOT NULL,
	`name` varchar(256) NOT NULL,
	`duration` int NOT NULL DEFAULT 1,
	`wbs` varchar(64),
	`percentComplete` decimal(5,2) NOT NULL DEFAULT '0.00',
	`actualStart` timestamp,
	`actualFinish` timestamp,
	`earlyStart` timestamp,
	`earlyFinish` timestamp,
	`lateStart` timestamp,
	`lateFinish` timestamp,
	`totalFloat` int,
	`freeFloat` int,
	`isCritical` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_code_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`codeValueId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_code_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_code_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_code_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_code_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`value` varchar(128) NOT NULL,
	`color` varchar(16),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_code_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`predecessorId` int NOT NULL,
	`successorId` int NOT NULL,
	`relationshipType` enum('FS','SS','FF','SF') NOT NULL DEFAULT 'FS',
	`lagDays` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_baselines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`activitiesSnapshot` json NOT NULL,
	`relationshipsSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_baselines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`projectStartDate` timestamp NOT NULL,
	`calendarType` enum('5day','7day') NOT NULL DEFAULT '5day',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`templateId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
