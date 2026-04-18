CREATE TABLE `xer_import_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`scheduleName` varchar(256),
	`status` enum('pending','parsing','importing','complete','failed') NOT NULL DEFAULT 'pending',
	`progressMessage` text,
	`scheduleId` int,
	`result` json,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xer_import_jobs_id` PRIMARY KEY(`id`)
);
