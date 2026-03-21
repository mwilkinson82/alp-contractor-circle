CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discordId` varchar(64) NOT NULL,
	`discordUsername` varchar(128),
	`discordDisplayName` text,
	`discordAvatar` varchar(256),
	`email` varchar(320),
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`subscriptionStatus` enum('active','canceled','past_due','trialing','incomplete','none') NOT NULL DEFAULT 'none',
	`memberRole` enum('member','founding_member','admin') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_discordId_unique` UNIQUE(`discordId`)
);
