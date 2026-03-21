CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discordId` varchar(64) NOT NULL,
	`discordUsername` varchar(128),
	`displayName` varchar(128),
	`email` varchar(320),
	`avatarUrl` text,
	`memberRole` enum('member','founding_member','admin') NOT NULL DEFAULT 'member',
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`subscriptionStatus` varchar(32) DEFAULT 'none',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_discordId_unique` UNIQUE(`discordId`)
);
--> statement-breakpoint
CREATE TABLE `replays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`videoUrl` text,
	`thumbnailUrl` text,
	`duration` varchar(32),
	`category` varchar(64) DEFAULT 'general',
	`sortOrder` int DEFAULT 0,
	`isPublished` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `replays_id` PRIMARY KEY(`id`)
);
