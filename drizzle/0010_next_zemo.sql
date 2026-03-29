CREATE TABLE `schedule_wbs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`parentId` int,
	`code` varchar(32) NOT NULL,
	`name` varchar(256) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_wbs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `barColor` varchar(16);--> statement-breakpoint
ALTER TABLE `activities` ADD `wbsId` int;