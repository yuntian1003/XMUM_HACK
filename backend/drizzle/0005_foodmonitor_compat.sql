CREATE TABLE IF NOT EXISTS `cfsr_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cfsr` float NOT NULL,
	`risk_band` varchar(32),
	`band` varchar(32),
	`components` json,
	`component_meta` json,
	`score_confidence` float,
	`score_coverage` float,
	`delta` float,
	`data_sources_summary` text,
	`computed_at` timestamp NULL,
	`n1ImportDep` float,
	`n2SupplyChain` float,
	`n3Fertilizer` float,
	`n4Geopolitical` float,
	`n5PriceVol` float,
	`confidence` float,
	`coverage` float,
	`snapshotAt` timestamp NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cfsr_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ingest_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job` varchar(128) NOT NULL,
	`success` boolean NOT NULL DEFAULT false,
	`started_at` timestamp NULL,
	`finished_at` timestamp NULL,
	`duration_ms` int,
	`rows_written` int,
	`error` text,
	`is_fallback` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingest_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fuzzy_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fertilizer_pressure_state` varchar(64),
	`price_trend_state` varchar(64),
	`compound_state` varchar(64),
	`score` float,
	`confidence` float,
	`coverage` float,
	`membership_scores` json,
	`computed_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuzzy_states_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_analyses` (
	`id` varchar(128) NOT NULL,
	`type` varchar(128) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`content` text NOT NULL,
	`structured_output` json,
	`prompt_hash` varchar(128),
	`data_context` json,
	`model` varchar(128),
	`confidence` float,
	`commodity` varchar(128),
	CONSTRAINT `ai_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `commodity_prices` (
	`id` varchar(128) NOT NULL,
	`source_id` varchar(64) NOT NULL,
	`series_type` varchar(64),
	`commodity_id` varchar(128),
	`commodity_name` varchar(255),
	`commodity_category` varchar(128),
	`location_level` varchar(64),
	`location_name` varchar(128),
	`date` date,
	`price_myr` float,
	`price_usd` float,
	`unit_canonical` varchar(64),
	`source_url` text,
	`ingested_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commodity_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pricecatcher_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`price` float,
	`item` varchar(255),
	`unit` varchar(64),
	`item_category` varchar(128),
	`premise` varchar(255),
	`premise_type` varchar(128),
	`state` varchar(128),
	`district` varchar(128),
	`ingested_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricecatcher_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `worldbank_commodities` (
	`commodity_code` varchar(64) NOT NULL,
	`source_header` varchar(255),
	`display_name` varchar(255),
	`category` varchar(128),
	`subcategory` varchar(128),
	`unit` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worldbank_commodities_commodity_code` PRIMARY KEY(`commodity_code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `worldbank_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`month_code` varchar(16),
	`commodity_code` varchar(64) NOT NULL,
	`price_usd` float,
	`unit` varchar(64),
	`source_url` text,
	`workbook_updated_at` timestamp NULL,
	`ingested_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worldbank_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `news_articles` (
	`id` varchar(128) NOT NULL,
	`source_id` varchar(128),
	`source` varchar(128),
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`published_at` timestamp NOT NULL,
	`ingested_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `article_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_id` varchar(128) NOT NULL,
	`sentiment_score` float,
	`insight_score` float,
	`severity` varchar(32),
	`is_alert` boolean DEFAULT false,
	`primary_commodity` varchar(128),
	`implication` text,
	`sentiment_side` varchar(32),
	`matched_keywords` json,
	`matched_keyword_score` float,
	`match_details` json,
	`used_broad_fallback` boolean,
	`food_security_relevance` float,
	`event_type` varchar(128),
	`source_authority` float,
	`analysis_confidence` float,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fuel_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`ron95` float,
	`ron97` float,
	`diesel` float,
	`ron95_budi95` float,
	`diesel_east_msia` float,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fx_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currency` varchar(8) NOT NULL,
	`date` date NOT NULL,
	`rate` float NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fx_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `macro_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`indicator_type` varchar(128),
	`type` varchar(128),
	`value` float,
	`base_currency` varchar(16),
	`target_currency` varchar(16),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `macro_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `manual_baselines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` float NOT NULL,
	`reviewed_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manual_baselines_id` PRIMARY KEY(`id`)
);
