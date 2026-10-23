-- Full-text index over topics and sources, rebuilt by every seed. One row per topic (source_position NULL)
-- and one per source. Weights for bm25() follow the column order: topic_id, source_position, name, body.
CREATE VIRTUAL TABLE `search_index` USING fts5(
	`topic_id` UNINDEXED,
	`source_position` UNINDEXED,
	`name`,
	`body`,
	tokenize = 'unicode61 remove_diacritics 2',
	prefix = '2 3'
);
