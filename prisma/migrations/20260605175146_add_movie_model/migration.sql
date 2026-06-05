-- CreateTable
CREATE TABLE `Movie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdbId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `overview` TEXT NOT NULL,
    `releaseDate` VARCHAR(191) NULL,
    `posterPath` VARCHAR(191) NULL,
    `backdropPath` VARCHAR(191) NULL,
    `popularity` DOUBLE NOT NULL,
    `voteAverage` DOUBLE NOT NULL,
    `voteCount` INTEGER NOT NULL,
    `adult` BOOLEAN NOT NULL DEFAULT false,
    `language` VARCHAR(191) NULL,
    `genreIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Movie_tmdbId_key`(`tmdbId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
