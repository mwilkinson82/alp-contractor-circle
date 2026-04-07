CREATE TABLE `drip_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`sequenceId` enum('estimating_single','q1q2_single','double_dipper','homepage_only') NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','paused','unsubscribed','converted') NOT NULL DEFAULT 'active',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`nextSendAt` timestamp,
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drip_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drip_sent_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`sequenceId` varchar(64) NOT NULL,
	`stepNumber` int NOT NULL,
	`resendId` varchar(128),
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drip_sent_emails_id` PRIMARY KEY(`id`)
);
