ALTER TABLE `schedule_baselines` ADD `snapshotType` enum('baseline','update') DEFAULT 'baseline' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedule_baselines` ADD `updateNumber` int;--> statement-breakpoint
ALTER TABLE `schedule_baselines` ADD `snapshotDataDate` timestamp;--> statement-breakpoint
ALTER TABLE `schedule_baselines` ADD `snapshotProjectStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `schedule_baselines` ADD `snapshotNotes` text;