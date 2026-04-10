CREATE TABLE `drawing_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`originalFilename` varchar(512),
	`pageNumber` int NOT NULL DEFAULT 1,
	`imageUrl` text,
	`imageKey` varchar(512),
	`sheetName` varchar(256),
	`sheetType` enum('floor_plan','elevation','section','detail','schedule','site_plan','structural','mep','electrical','plumbing','hvac','landscape','cover','other') NOT NULL DEFAULT 'other',
	`status` enum('pending','processing','completed','error','skipped') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`aiRawResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drawing_sheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoff_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sheetId` int NOT NULL,
	`csiDivision` varchar(8),
	`csiCode` varchar(16),
	`description` varchar(512) NOT NULL,
	`quantity` decimal(12,2) NOT NULL DEFAULT '0.00',
	`unit` varchar(16) NOT NULL DEFAULT 'EA',
	`unitCost` int NOT NULL DEFAULT 0,
	`extendedCost` int NOT NULL DEFAULT 0,
	`confidence` int NOT NULL DEFAULT 80,
	`notes` text,
	`reviewed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoff_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoff_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`status` enum('draft','uploading','processing','completed','error') NOT NULL DEFAULT 'draft',
	`totalSheets` int NOT NULL DEFAULT 0,
	`processedSheets` int NOT NULL DEFAULT 0,
	`totalEstimatedCost` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoff_projects_id` PRIMARY KEY(`id`)
);
