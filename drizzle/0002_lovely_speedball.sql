CREATE TABLE `replays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`category` enum('weekly_calls','bootcamp','masterclass','q_and_a') NOT NULL DEFAULT 'weekly_calls',
	`cloudflareStreamId` varchar(128) NOT NULL,
	`duration` varchar(32),
	`callDate` timestamp NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `replays_id` PRIMARY KEY(`id`)
);
