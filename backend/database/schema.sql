-- ==========================================================
-- UPMIZIK - DATABASE SCHEMA (MySQL / Hostinger)
-- ==========================================================
-- Enpòte fichye sa a dirèkteman nan phpMyAdmin sou Hostinger.
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. Tablo: artists (Tout atis ki anrejistre)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `artists` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `stageName` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(64) NOT NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Pòtoprens',
  `pin` VARCHAR(16) NOT NULL DEFAULT '0000',
  `avatarUrl` TEXT DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `musicalRoots` VARCHAR(255) DEFAULT NULL,
  `musicalInfluences` TEXT DEFAULT NULL,
  `artisticVision` TEXT DEFAULT NULL,
  `artistQuote` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  `registrationProofUrl` TEXT DEFAULT NULL,
  `registrationRejectionReason` TEXT DEFAULT NULL,
  `registrationDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `totalListens` BIGINT NOT NULL DEFAULT 0,
  `totalDonationsReceived` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `suspendedAt` DATETIME DEFAULT NULL,
  `suspendedUntil` DATETIME DEFAULT NULL,
  `suspensionDays` INT DEFAULT NULL,
  `suspensionReason` TEXT DEFAULT NULL,
  `youtubeUrl` VARCHAR(512) DEFAULT NULL,
  `instagramUrl` VARCHAR(512) DEFAULT NULL,
  `instagramHandle` VARCHAR(128) DEFAULT NULL,
  `tiktokUrl` VARCHAR(512) DEFAULT NULL,
  `tiktokHandle` VARCHAR(128) DEFAULT NULL,
  `twitterUrl` VARCHAR(512) DEFAULT NULL,
  `twitterHandle` VARCHAR(128) DEFAULT NULL,
  `headerBannerUrl` TEXT DEFAULT NULL,
  `bannerGenreTheme` VARCHAR(64) DEFAULT NULL,
  `isPaidThisMonth` TINYINT(1) NOT NULL DEFAULT 0,
  `paidDateThisMonth` DATETIME DEFAULT NULL,
  `paidAmountThisMonth` DECIMAL(10,2) DEFAULT NULL,
  `paidReferenceThisMonth` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_artist_status` (`status`),
  INDEX `idx_artist_email` (`email`),
  INDEX `idx_artist_stageName` (`stageName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Tablo: musics (Mizik, Chante, Track, Albòm)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `musics` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `artistId` VARCHAR(64) NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `feat` VARCHAR(255) DEFAULT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'Tout',
  `releaseFormat` ENUM('single', 'album', 'ep', 'mixtape', 'demo') NOT NULL DEFAULT 'single',
  `albumName` VARCHAR(255) DEFAULT NULL,
  `trackNumber` INT DEFAULT 1,
  `coverUrl` TEXT NOT NULL,
  `audioUrl` TEXT NOT NULL,
  `duration` INT NOT NULL DEFAULT 180,
  `listens` BIGINT NOT NULL DEFAULT 0,
  `totalDonations` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `position` INT DEFAULT NULL,
  `youtubeUrl` VARCHAR(512) DEFAULT NULL,
  `tiktokUrl` VARCHAR(512) DEFAULT NULL,
  `instagramUrl` VARCHAR(512) DEFAULT NULL,
  `commentsCount` INT NOT NULL DEFAULT 0,
  `sharesCount` INT NOT NULL DEFAULT 0,
  `likesCount` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'pending', 'rejected') NOT NULL DEFAULT 'active',
  `rejectionReason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_music_artist` (`artistId`),
  INDEX `idx_music_category` (`category`),
  INDEX `idx_music_status` (`status`),
  INDEX `idx_music_listens` (`listens`),
  CONSTRAINT `fk_music_artist` FOREIGN KEY (`artistId`) REFERENCES `artists` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Tablo: music_credits (Split sheet & kolaborasyon)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `music_credits` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musicId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `artistId` VARCHAR(64) DEFAULT NULL,
  `role` VARCHAR(128) NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `phone` VARCHAR(64) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_credits_music` (`musicId`),
  CONSTRAINT `fk_credits_music` FOREIGN KEY (`musicId`) REFERENCES `musics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Tablo: donations (Donasyon, Kontribisyon, Sipò Fanatik)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musicId` VARCHAR(64) NOT NULL,
  `musicTitle` VARCHAR(255) NOT NULL,
  `artistId` VARCHAR(64) NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` ENUM('USD', 'HTG') NOT NULL DEFAULT 'USD',
  `donorName` VARCHAR(255) NOT NULL,
  `donorPhone` VARCHAR(64) NOT NULL,
  `proofUrl` TEXT NOT NULL,
  `paymentMethod` VARCHAR(64) DEFAULT 'MonCash',
  `status` ENUM('pending', 'validated', 'rejected') NOT NULL DEFAULT 'pending',
  `artistShare` DECIMAL(10,2) NOT NULL,
  `platformShare` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_donations_artist` (`artistId`),
  INDEX `idx_donations_music` (`musicId`),
  INDEX `idx_donations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Tablo: artist_inbox (Bwat mesaj, notifikasyon & notis atis)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `artist_inbox` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `artistId` VARCHAR(64) NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `artistEmail` VARCHAR(255) DEFAULT NULL,
  `type` VARCHAR(64) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `senderName` VARCHAR(255) NOT NULL DEFAULT 'Ekip UpMizik',
  `senderEmail` VARCHAR(255) NOT NULL DEFAULT 'noreply@upmizik.com',
  `recipientEmail` VARCHAR(255) NOT NULL,
  `previewText` TEXT NOT NULL,
  `bodyText` LONGTEXT NOT NULL,
  `receivedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `isStarred` TINYINT(1) NOT NULL DEFAULT 0,
  `musicDetails` JSON DEFAULT NULL,
  `awardDetails` JSON DEFAULT NULL,
  `donationDetails` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_inbox_artist` (`artistId`),
  INDEX `idx_inbox_isRead` (`isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Tablo: social_posts (Piblikasyon feed sosyal atis yo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `social_posts` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `artistId` VARCHAR(64) NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `stageName` VARCHAR(255) NOT NULL,
  `artistAvatar` TEXT DEFAULT NULL,
  `platform` ENUM('twitter', 'instagram') NOT NULL DEFAULT 'twitter',
  `handle` VARCHAR(128) NOT NULL,
  `postUrl` VARCHAR(512) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `imageUrl` TEXT DEFAULT NULL,
  `timestamp` VARCHAR(64) NOT NULL DEFAULT 'Kounye a',
  `likes` INT NOT NULL DEFAULT 0,
  `commentsCount` INT NOT NULL DEFAULT 0,
  `retweetsCount` INT NOT NULL DEFAULT 0,
  `sharesCount` INT NOT NULL DEFAULT 0,
  `associatedSongId` VARCHAR(64) DEFAULT NULL,
  `associatedSongTitle` VARCHAR(255) DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `isPinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_posts_artist` (`artistId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Tablo: social_comments (Kòmantè sou post sosyal yo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `social_comments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `postId` VARCHAR(64) NOT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `authorAvatar` TEXT DEFAULT NULL,
  `content` TEXT NOT NULL,
  `likes` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_social_comments_post` (`postId`),
  CONSTRAINT `fk_social_comments_post` FOREIGN KEY (`postId`) REFERENCES `social_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Tablo: music_comments (Kòmantè anba mizik)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `music_comments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musicId` VARCHAR(64) NOT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `text` TEXT NOT NULL,
  `likes` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_music_comments_music` (`musicId`),
  CONSTRAINT `fk_music_comments_music` FOREIGN KEY (`musicId`) REFERENCES `musics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. Tablo: push_notifications (Notifikasyon pouse)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `push_notifications` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `targetArtistId` VARCHAR(64) NOT NULL DEFAULT 'all',
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `icon` TEXT DEFAULT NULL,
  `badge` TEXT DEFAULT NULL,
  `imageUrl` TEXT DEFAULT NULL,
  `data` JSON DEFAULT NULL,
  `timestamp` BIGINT NOT NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `actionUrl` VARCHAR(512) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_push_target` (`targetArtistId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. Tablo: archive_records (Achivman chak fen mwa)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `archive_records` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `resetDate` DATETIME NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `musicTitle` VARCHAR(255) NOT NULL,
  `totalDonations` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `artistShare` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `platformShare` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `period` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. Tablo: pubs (Piblisite & banyè komèsyal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pubs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `imageUrl` TEXT NOT NULL,
  `mediaUrl` TEXT DEFAULT NULL,
  `mediaType` ENUM('image', 'gif', 'video') NOT NULL DEFAULT 'image',
  `linkUrl` VARCHAR(512) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sponsorName` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 12. Tablo: rpa (Révélation / Pwojè Atis nan vedèt)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rpa` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `artistName` VARCHAR(255) NOT NULL,
  `imageUrl` TEXT NOT NULL,
  `mediaUrl` TEXT DEFAULT NULL,
  `mediaType` ENUM('image', 'gif', 'video') NOT NULL DEFAULT 'image',
  `socialLink` VARCHAR(512) NOT NULL,
  `youtubeUrl` VARCHAR(512) DEFAULT NULL,
  `badgeText` VARCHAR(128) NOT NULL DEFAULT 'Révélation du mois',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 13. Tablo: security_logs (Sekirite admin, tantativ koneksyon)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `security_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attemptedEmail` VARCHAR(255) NOT NULL,
  `attemptCount` INT NOT NULL DEFAULT 1,
  `stage` ENUM('primary_login', 'master_key') NOT NULL DEFAULT 'primary_login',
  `photoUrl` LONGTEXT DEFAULT NULL,
  `userAgent` TEXT NOT NULL,
  `ipPlaceholder` VARCHAR(64) DEFAULT NULL,
  `status` ENUM('alert', 'reviewed') NOT NULL DEFAULT 'alert',
  `notes` TEXT DEFAULT NULL,
  `unlockToken` VARCHAR(128) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 14. Tablo: platform_settings (Opsyon & nimewo MonCash/Natcash)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `setting_key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 15. Tablo: tentatives_connexion (Rate Limiting & Fòs Brit)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tentatives_connexion` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `identifiant` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `ip_adresse` VARCHAR(64) NOT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `succes` TINYINT(1) NOT NULL DEFAULT 0,
  `date_tentative` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tentatives_identifiant` (`identifiant`),
  INDEX `idx_tentatives_email` (`email`),
  INDEX `idx_tentatives_ip` (`ip_adresse`),
  INDEX `idx_tentatives_date` (`date_tentative`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 16. Tablo: blocages_securite (Blokaj Tanporè Rate Limiting)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blocages_securite` (
  `identifiant` VARCHAR(255) NOT NULL PRIMARY KEY,
  `ip_adresse` VARCHAR(64) DEFAULT NULL,
  `tentatives_echouees` INT NOT NULL DEFAULT 1,
  `bloque_jusqua` DATETIME NOT NULL,
  `alerte_email_envoyee` TINYINT(1) NOT NULL DEFAULT 0,
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_mise_a_jour` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_blocages_date` (`bloque_jusqua`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 17. Tablo: logs_activite (Jounal Aktivite & Tantativ Koneksyon)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs_activite` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `type_evenement` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `artiste_id` VARCHAR(64) DEFAULT NULL,
  `nom_scene` VARCHAR(255) DEFAULT NULL,
  `motif` TEXT NOT NULL,
  `ip_adresse` VARCHAR(64) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `statut` VARCHAR(32) NOT NULL DEFAULT 'warning',
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_email` (`email`),
  INDEX `idx_logs_type` (`type_evenement`),
  INDEX `idx_logs_statut` (`statut`),
  INDEX `idx_logs_date` (`date_creation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inisyalize konfigirasyon peman debaz
INSERT INTO `platform_settings` (`setting_key`, `setting_value`) VALUES
('moncash_numbers', '["+509 3800-0000", "+509 4400-0000"]'),
('natcash_numbers', '["+509 3200-0000"]'),
('registration_fee_usd', '4.99'),
('donation_fee_fixed', '0.99'),
('artist_percentage', '85'),
('platform_percentage', '15')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

SET FOREIGN_KEY_CHECKS = 1;
