CREATE TABLE `fx_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currency` varchar(8) NOT NULL,
	`rate` float NOT NULL,
	`observedAt` timestamp NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'live_bnm_api',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fx_snapshots_id` PRIMARY KEY(`id`),
	KEY `fx_snapshots_currency_observedAt` (`currency`,`observedAt`)
);