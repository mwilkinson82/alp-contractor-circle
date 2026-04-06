CREATE TABLE `bootcamp_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`topic` varchar(512) NOT NULL,
	`reason` text,
	`bootcampDate` varchar(32) NOT NULL,
	`status` enum('submitted','selected','not_selected') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bootcamp_topics_id` PRIMARY KEY(`id`)
);
