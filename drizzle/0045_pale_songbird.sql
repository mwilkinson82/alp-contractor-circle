CREATE TABLE `rate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`projectType` varchar(64),
	`workType` varchar(64),
	`region` varchar(128),
	`ratesSnapshot` text,
	`crewsSnapshot` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_profiles_id` PRIMARY KEY(`id`)
);
