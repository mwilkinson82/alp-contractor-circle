CREATE TABLE `user_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`displayName` varchar(256),
	`action` varchar(128) NOT NULL,
	`description` varchar(512) NOT NULL,
	`refPath` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_activity_log_id` PRIMARY KEY(`id`)
);
