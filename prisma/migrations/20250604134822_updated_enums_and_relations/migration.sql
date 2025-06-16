-- CreateTable
CREATE TABLE `Mayor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `subscriptionStatus` ENUM('ACTIVE', 'INACTIVE', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `subscriptionEndDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Mayor_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Village` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mayorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Village_name_key`(`name`),
    INDEX `Village_mayorId_idx`(`mayorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Farmer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `companyCode` VARCHAR(191) NOT NULL,
    `village` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Farmer_companyCode_key`(`companyCode`),
    UNIQUE INDEX `Farmer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Parcel` (
    `id` VARCHAR(191) NOT NULL,
    `village` VARCHAR(191) NOT NULL,
    `area` DOUBLE NOT NULL,
    `coordinates` JSON NOT NULL,
    `ownerId` VARCHAR(191) NULL,
    `cultivatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Parcel_village_idx`(`village`),
    INDEX `Parcel_ownerId_idx`(`ownerId`),
    INDEX `Parcel_cultivatorId_idx`(`cultivatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogEntry` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `logType` ENUM('ASSIGNMENT', 'USER_ACTION', 'SYSTEM', 'PARCEL_UPLOAD', 'ADMIN_ACTION') NOT NULL,
    `actor` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,

    INDEX `LogEntry_timestamp_idx`(`timestamp`),
    INDEX `LogEntry_logType_idx`(`logType`),
    INDEX `LogEntry_actor_idx`(`actor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Village` ADD CONSTRAINT `Village_mayorId_fkey` FOREIGN KEY (`mayorId`) REFERENCES `Mayor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parcel` ADD CONSTRAINT `Parcel_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `Farmer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parcel` ADD CONSTRAINT `Parcel_cultivatorId_fkey` FOREIGN KEY (`cultivatorId`) REFERENCES `Farmer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
