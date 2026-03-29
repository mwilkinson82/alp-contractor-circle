CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(128) NOT NULL,
	`url` text NOT NULL,
	`fileType` varchar(16) NOT NULL DEFAULT 'pdf',
	`featured` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
