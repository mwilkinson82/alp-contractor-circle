CREATE TABLE `measurement_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`projectId` int NOT NULL,
	`sheetId` int NOT NULL,
	`measurementType` varchar(16) NOT NULL,
	`rawValue` decimal(20,4) NOT NULL,
	`unit` varchar(16) NOT NULL,
	`memberId` int NOT NULL,
	`sheetName` varchar(255),
	`itemDescription` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `measurement_history_id` PRIMARY KEY(`id`)
);
