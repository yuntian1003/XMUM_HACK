CREATE TABLE `fertiliser_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fieldId` varchar(128) NOT NULL,
	`soilReadingId` int,
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'active',
	`planData` json NOT NULL,
	`totalAreaHa` float,
	`estimatedCostMyr` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fertiliser_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`headline` text NOT NULL,
	`summary` text,
	`source` varchar(128),
	`url` text,
	`category` enum('conflict','weather','supply_chain','price','policy','other') NOT NULL DEFAULT 'other',
	`sentiment` enum('positive','neutral','negative') NOT NULL DEFAULT 'neutral',
	`sentimentScore` float,
	`impactScore` float,
	`affectedCountries` json,
	`affectedCommodities` json,
	`publishedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country` varchar(64) NOT NULL,
	`countryCode` varchar(4),
	`scrsScore` float NOT NULL,
	`newsSentimentScore` float,
	`shippingDisruptionScore` float,
	`weatherAnomalyScore` float,
	`priceMomentumScore` float,
	`riskLevel` enum('low','moderate','high','critical') NOT NULL DEFAULT 'low',
	`profileData` json,
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `soil_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fieldId` varchar(128) NOT NULL,
	`plotLabel` varchar(64),
	`nitrogen` float NOT NULL,
	`phosphorus` float NOT NULL,
	`potassium` float NOT NULL,
	`ph` float NOT NULL,
	`organicMatter` float,
	`moisture` float,
	`temperature` float,
	`cropVariety` varchar(128),
	`growthStage` varchar(64),
	`latitude` float,
	`longitude` float,
	`notes` text,
	`recordedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `soil_readings_id` PRIMARY KEY(`id`)
);
