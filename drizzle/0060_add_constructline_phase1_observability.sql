CREATE TABLE `takeoff_analysis_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `runType` varchar(64) NOT NULL DEFAULT 'full_analysis',
  `status` enum('queued','running','completed','error','canceled') NOT NULL DEFAULT 'queued',
  `modelProfile` varchar(128),
  `sheetCount` int NOT NULL DEFAULT 0,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `durationMs` int,
  `totalPromptTokens` int NOT NULL DEFAULT 0,
  `totalCompletionTokens` int NOT NULL DEFAULT 0,
  `totalTokens` int NOT NULL DEFAULT 0,
  `estimatedCostCents` int,
  `summary` json,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `takeoff_analysis_runs_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_takeoff_analysis_runs_project_created` ON `takeoff_analysis_runs` (`projectId`, `createdAt`);
CREATE INDEX `idx_takeoff_analysis_runs_status` ON `takeoff_analysis_runs` (`status`);

CREATE TABLE `takeoff_llm_attempts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `runId` int,
  `sheetId` int,
  `passType` varchar(64) NOT NULL,
  `status` enum('success','error') NOT NULL,
  `model` varchar(128) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `promptVersion` varchar(64),
  `promptHash` varchar(64),
  `detail` varchar(16),
  `retryAttempt` int NOT NULL DEFAULT 0,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `durationMs` int,
  `promptTokens` int NOT NULL DEFAULT 0,
  `completionTokens` int NOT NULL DEFAULT 0,
  `totalTokens` int NOT NULL DEFAULT 0,
  `estimatedCostCents` int,
  `errorMessage` text,
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `takeoff_llm_attempts_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_takeoff_llm_attempts_project_run` ON `takeoff_llm_attempts` (`projectId`, `runId`);
CREATE INDEX `idx_takeoff_llm_attempts_sheet` ON `takeoff_llm_attempts` (`sheetId`);
CREATE INDEX `idx_takeoff_llm_attempts_pass_status` ON `takeoff_llm_attempts` (`passType`, `status`);

CREATE TABLE `takeoff_qa_findings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projectId` int NOT NULL,
  `runId` int,
  `findingKey` varchar(128) NOT NULL,
  `severity` enum('blocker','risk','review','reference') NOT NULL DEFAULT 'review',
  `category` varchar(128) NOT NULL,
  `title` varchar(256) NOT NULL,
  `description` text,
  `amountCents` int NOT NULL DEFAULT 0,
  `itemCount` int NOT NULL DEFAULT 0,
  `itemIds` json,
  `status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  `resolutionNote` text,
  `resolvedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `takeoff_qa_findings_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_takeoff_qa_findings_project_status` ON `takeoff_qa_findings` (`projectId`, `status`);
CREATE INDEX `idx_takeoff_qa_findings_run` ON `takeoff_qa_findings` (`runId`);
