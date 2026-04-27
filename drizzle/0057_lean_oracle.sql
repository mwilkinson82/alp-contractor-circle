ALTER TABLE `replays` MODIFY COLUMN `cloudflareStreamId` varchar(128);--> statement-breakpoint
ALTER TABLE `replays` ADD `videoSource` enum('cloudflare','zoom_clips') DEFAULT 'cloudflare' NOT NULL;--> statement-breakpoint
ALTER TABLE `replays` ADD `zoomClipsUrl` varchar(512);