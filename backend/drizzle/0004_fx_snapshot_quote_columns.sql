ALTER TABLE `fx_snapshots`
ADD COLUMN `buyingRate` float NOT NULL DEFAULT 0,
ADD COLUMN `middleRate` float,
ADD COLUMN `sellingRate` float;

UPDATE `fx_snapshots`
SET `buyingRate` = `rate`
WHERE `buyingRate` = 0;
