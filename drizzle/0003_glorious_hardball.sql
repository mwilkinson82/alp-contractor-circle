CREATE TABLE `call_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`question` text NOT NULL,
	`context` text,
	`status` enum('pending','selected_for_call','selected_for_bootcamp','answered','archived') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`callCycle` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `call_questions_id` PRIMARY KEY(`id`)
);
