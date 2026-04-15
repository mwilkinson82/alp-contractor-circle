CREATE TABLE `user_cost_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`csiDivision` varchar(8),
	`description` varchar(512) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`unitCost` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_cost_library_id` PRIMARY KEY(`id`)
);
