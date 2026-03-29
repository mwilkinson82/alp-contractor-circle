ALTER TABLE `activities` ADD `constraintType` varchar(16) DEFAULT 'ASAP' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `constraintDate` timestamp;