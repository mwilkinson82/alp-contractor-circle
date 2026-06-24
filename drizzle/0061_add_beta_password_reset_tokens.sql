CREATE TABLE `beta_password_reset_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `betaUserId` int NOT NULL,
  `tokenHash` varchar(128) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `beta_password_reset_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `beta_password_reset_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
