CREATE TABLE `schedule_layouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`config` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_layouts_id` PRIMARY KEY(`id`)
);
