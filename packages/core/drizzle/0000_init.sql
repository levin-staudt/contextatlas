CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`topic_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`pattern` text NOT NULL,
	PRIMARY KEY(`topic_id`, `position`),
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `signals_type_idx` ON `signals` (`type`);--> statement-breakpoint
CREATE TABLE `sources` (
	`topic_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	PRIMARY KEY(`topic_id`, `position`),
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`summary` text NOT NULL,
	`best_for` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `topics_region_idx` ON `topics` (`region_id`,`position`);