CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`memberName` varchar(128),
	`message` text NOT NULL,
	`screenshotUrl` text,
	`page` varchar(512),
	`userAgent` text,
	`category` enum('bug','feature','general','other') NOT NULL DEFAULT 'general',
	`status` enum('new','reviewed','in_progress','resolved','wont_fix') NOT NULL DEFAULT 'new',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
