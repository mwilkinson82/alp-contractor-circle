CREATE TABLE `calendar_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calendarId` int NOT NULL,
	`exceptionDate` timestamp NOT NULL,
	`exceptionType` enum('holiday','workday') NOT NULL DEFAULT 'holiday',
	`description` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_exceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_calendars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`workWeek` enum('5day','7day') NOT NULL DEFAULT '5day',
	`workDaysMask` int NOT NULL DEFAULT 31,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_calendars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `calendarId` int;--> statement-breakpoint
ALTER TABLE `schedules` ADD `defaultCalendarId` int;--> statement-breakpoint
ALTER TABLE `schedules` DROP COLUMN `calendarType`;