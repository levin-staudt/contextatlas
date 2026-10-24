CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`submission_id` integer,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_id` text NOT NULL,
	`type` text NOT NULL,
	`topic_id` text,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`review_note` text,
	FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`,`id`);--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_hash_unique` ON `tokens` (`hash`);