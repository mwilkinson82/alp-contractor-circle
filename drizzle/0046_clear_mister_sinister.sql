CREATE TABLE `user_presence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`displayName` varchar(256),
	`currentPage` varchar(512),
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`sessionStart` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_presence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `takeoff_projects` ADD `rateProfileId` int;