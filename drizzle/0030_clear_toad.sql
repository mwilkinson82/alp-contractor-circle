CREATE TABLE `sheet_markups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sheetId` int NOT NULL,
	`memberId` int NOT NULL,
	`projectId` int NOT NULL,
	`shapesJson` text NOT NULL,
	`scaleRatio` decimal(20,6) NOT NULL DEFAULT '0',
	`scaleUnit` varchar(8) NOT NULL DEFAULT 'px',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sheet_markups_id` PRIMARY KEY(`id`)
);
