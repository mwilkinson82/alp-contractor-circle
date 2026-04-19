ALTER TABLE `beta_users` ADD `discordId` varchar(32);--> statement-breakpoint
ALTER TABLE `beta_users` ADD `discordUsername` varchar(128);--> statement-breakpoint
ALTER TABLE `beta_users` ADD `discordConnectedAt` timestamp;