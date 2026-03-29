ALTER TABLE `schedules` ADD `activityIdPrefix` varchar(10) DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `activityIdStart` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `activityIdInterval` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `activityIdNext` int DEFAULT 1 NOT NULL;