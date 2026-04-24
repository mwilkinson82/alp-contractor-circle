CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`email` varchar(255),
	`discordUsername` varchar(128),
	`stripeId` varchar(255),
	`details` text,
	`success` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drip_enrollments` MODIFY COLUMN `sequenceId` enum('estimating_single','q1q2_single','double_dipper','homepage_only','three_silos_single') NOT NULL;