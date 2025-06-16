-- AlterTable
ALTER TABLE `farmer` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `mayor` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
