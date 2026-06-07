-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movies` (
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
    `localVoteAverage` DOUBLE NOT NULL DEFAULT 0,
    `localVoteCount` INTEGER NOT NULL DEFAULT 0,
    `totalVoteAverage` DOUBLE NOT NULL DEFAULT 0,
    `totalVoteCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `movies_tmdbId_key`(`tmdbId`),
    INDEX `movies_totalVoteAverage_idx`(`totalVoteAverage`),
    INDEX `movies_popularity_idx`(`popularity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdbId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `genres_tmdbId_key`(`tmdbId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `movieId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ratings_userId_movieId_key`(`userId`, `movieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_UserWatchlist` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserWatchlist_AB_unique`(`A`, `B`),
    INDEX `_UserWatchlist_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GenreToMovie` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GenreToMovie_AB_unique`(`A`, `B`),
    INDEX `_GenreToMovie_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserWatchlist` ADD CONSTRAINT `_UserWatchlist_A_fkey` FOREIGN KEY (`A`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserWatchlist` ADD CONSTRAINT `_UserWatchlist_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GenreToMovie` ADD CONSTRAINT `_GenreToMovie_A_fkey` FOREIGN KEY (`A`) REFERENCES `genres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GenreToMovie` ADD CONSTRAINT `_GenreToMovie_B_fkey` FOREIGN KEY (`B`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
