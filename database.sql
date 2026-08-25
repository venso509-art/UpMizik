-- ==========================================================
-- UPMIZIK - BAZ DONE MYSQL POU HOSTINGER (PHPMYADMIN)
-- ==========================================================
-- Tab prensipal yo: utilisateurs, artistes, musiques, dons
-- Kopiye tout kòd sa a epi kole l nan onglet SQL nan phpMyAdmin.
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. TAB: utilisateurs (Administratè, Moderatè, Manm)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nom` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `mot_de_passe` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'super_admin', 'moderateur', 'fan') NOT NULL DEFAULT 'fan',
  `telephone` VARCHAR(64) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `statut` ENUM('actif', 'bloque', 'en_attente') NOT NULL DEFAULT 'actif',
  `cle_recuperation` VARCHAR(128) DEFAULT NULL,
  `derniere_connexion` DATETIME DEFAULT NULL,
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_utilisateurs_email` (`email`),
  INDEX `idx_utilisateurs_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. TAB: artistes (Atis ki anrejistre sou UpMizik)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `artistes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nom_scene` VARCHAR(255) NOT NULL,
  `nom_complet` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `telephone` VARCHAR(64) NOT NULL,
  `ville` VARCHAR(128) NOT NULL DEFAULT 'Pòtoprens',
  `pin` VARCHAR(255) NOT NULL DEFAULT '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789',
  `avatar_url` TEXT DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `racines_musicales` VARCHAR(255) DEFAULT NULL,
  `influences` TEXT DEFAULT NULL,
  `vision_artistique` TEXT DEFAULT NULL,
  `citation` TEXT DEFAULT NULL,
  `statut` ENUM('en_attente', 'actif', 'rejete', 'suspendu') NOT NULL DEFAULT 'en_attente',
  `preuve_inscription_url` TEXT DEFAULT NULL,
  `raison_rejet` TEXT DEFAULT NULL,
  `total_ecoutes` BIGINT NOT NULL DEFAULT 0,
  `total_dons_recus` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `youtube_url` VARCHAR(512) DEFAULT NULL,
  `instagram_url` VARCHAR(512) DEFAULT NULL,
  `tiktok_url` VARCHAR(512) DEFAULT NULL,
  `banniere_url` TEXT DEFAULT NULL,
  `theme_banniere` VARCHAR(64) DEFAULT NULL,
  `paye_ce_mois` TINYINT(1) NOT NULL DEFAULT 0,
  `date_paiement` DATETIME DEFAULT NULL,
  `montant_paye` DECIMAL(10,2) DEFAULT NULL,
  `reference_paiement` VARCHAR(128) DEFAULT NULL,
  `date_inscription` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_mise_a_jour` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_artistes_statut` (`statut`),
  INDEX `idx_artistes_email` (`email`),
  INDEX `idx_artistes_nom_scene` (`nom_scene`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. TAB: musiques (Mizik, Chante, Track, Albòm)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `musiques` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `titre` VARCHAR(255) NOT NULL,
  `artiste_id` VARCHAR(64) NOT NULL,
  `nom_artiste` VARCHAR(255) NOT NULL,
  `featuring` VARCHAR(255) DEFAULT NULL,
  `categorie` VARCHAR(64) NOT NULL DEFAULT 'Tout',
  `format` ENUM('single', 'album', 'ep', 'mixtape', 'demo') NOT NULL DEFAULT 'single',
  `nom_album` VARCHAR(255) DEFAULT NULL,
  `numero_piste` INT DEFAULT 1,
  `cover_url` TEXT NOT NULL,
  `audio_url` TEXT NOT NULL,
  `duree` INT NOT NULL DEFAULT 180,
  `ecoutes` BIGINT NOT NULL DEFAULT 0,
  `total_dons` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `position` INT DEFAULT NULL,
  `youtube_url` VARCHAR(512) DEFAULT NULL,
  `tiktok_url` VARCHAR(512) DEFAULT NULL,
  `instagram_url` VARCHAR(512) DEFAULT NULL,
  `statut` ENUM('actif', 'en_attente', 'rejete') NOT NULL DEFAULT 'actif',
  `raison_rejet` TEXT DEFAULT NULL,
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_mise_a_jour` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_musiques_artiste` (`artiste_id`),
  INDEX `idx_musiques_categorie` (`categorie`),
  INDEX `idx_musiques_statut` (`statut`),
  INDEX `idx_musiques_ecoutes` (`ecoutes`),
  CONSTRAINT `fk_musiques_artiste` FOREIGN KEY (`artiste_id`) REFERENCES `artistes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. TAB: dons (Sipò & Donasyon Fanatik ak Prèv MonCash/Natcash)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dons` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musique_id` VARCHAR(64) DEFAULT NULL,
  `titre_musique` VARCHAR(255) NOT NULL DEFAULT 'Donasyon Dirèk Pou Atis',
  `artiste_id` VARCHAR(64) NOT NULL,
  `nom_artiste` VARCHAR(255) NOT NULL,
  `montant` DECIMAL(10,2) NOT NULL,
  `devise` ENUM('USD', 'HTG') NOT NULL DEFAULT 'USD',
  `nom_donateur` VARCHAR(255) NOT NULL,
  `telephone_donateur` VARCHAR(64) NOT NULL,
  `preuve_url` TEXT NOT NULL,
  `methode_paiement` VARCHAR(64) DEFAULT 'MonCash',
  `statut` ENUM('en_attente', 'valide', 'rejete') NOT NULL DEFAULT 'en_attente',
  `part_artiste` DECIMAL(10,2) NOT NULL,
  `part_plateforme` DECIMAL(10,2) NOT NULL,
  `date_don` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_dons_artiste` (`artiste_id`),
  INDEX `idx_dons_musique` (`musique_id`),
  INDEX `idx_dons_statut` (`statut`),
  CONSTRAINT `fk_dons_artiste` FOREIGN KEY (`artiste_id`) REFERENCES `artistes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. TAB: credits_musique (Split Sheets & Dwa Otè)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credits_musique` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musique_id` VARCHAR(64) NOT NULL,
  `nom` VARCHAR(255) NOT NULL,
  `artiste_id` VARCHAR(64) DEFAULT NULL,
  `role` VARCHAR(128) NOT NULL,
  `pourcentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `telephone` VARCHAR(64) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_credits_musique` (`musique_id`),
  CONSTRAINT `fk_credits_musique` FOREIGN KEY (`musique_id`) REFERENCES `musiques` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. TAB: messages_inbox (Bwat Mesaj & Notifikasyon Atis)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages_inbox` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `artiste_id` VARCHAR(64) NOT NULL,
  `nom_artiste` VARCHAR(255) NOT NULL,
  `email_artiste` VARCHAR(255) DEFAULT NULL,
  `type` VARCHAR(64) NOT NULL,
  `sujet` VARCHAR(255) NOT NULL,
  `nom_expediteur` VARCHAR(255) NOT NULL DEFAULT 'Ekip UpMizik',
  `email_expediteur` VARCHAR(255) NOT NULL DEFAULT 'noreply@upmizik.com',
  `email_destinataire` VARCHAR(255) NOT NULL,
  `apercu` TEXT NOT NULL,
  `contenu` LONGTEXT NOT NULL,
  `est_lu` TINYINT(1) NOT NULL DEFAULT 0,
  `est_favori` TINYINT(1) NOT NULL DEFAULT 0,
  `details_don` JSON DEFAULT NULL,
  `details_musique` JSON DEFAULT NULL,
  `date_reception` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_inbox_artiste` (`artiste_id`),
  INDEX `idx_inbox_lu` (`est_lu`),
  CONSTRAINT `fk_inbox_artiste` FOREIGN KEY (`artiste_id`) REFERENCES `artistes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. TAB: publications_sociales (Feed Sosyal Atis)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `publications_sociales` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `artiste_id` VARCHAR(64) NOT NULL,
  `nom_artiste` VARCHAR(255) NOT NULL,
  `nom_scene` VARCHAR(255) NOT NULL,
  `avatar_artiste` TEXT DEFAULT NULL,
  `plateforme` ENUM('twitter', 'instagram') NOT NULL DEFAULT 'twitter',
  `handle` VARCHAR(128) NOT NULL,
  `contenu` TEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `likes` INT NOT NULL DEFAULT 0,
  `commentaires_count` INT NOT NULL DEFAULT 0,
  `musique_associee_id` VARCHAR(64) DEFAULT NULL,
  `musique_associee_titre` VARCHAR(255) DEFAULT NULL,
  `est_epingle` TINYINT(1) NOT NULL DEFAULT 0,
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_publications_artiste` (`artiste_id`),
  CONSTRAINT `fk_publications_artiste` FOREIGN KEY (`artiste_id`) REFERENCES `artistes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. TAB: commentaires_musique (Kòmantè anba mizik yo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `commentaires_musique` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `musique_id` VARCHAR(64) NOT NULL,
  `nom_auteur` VARCHAR(255) NOT NULL,
  `texte` TEXT NOT NULL,
  `likes` INT NOT NULL DEFAULT 0,
  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_commentaires_musique` (`musique_id`),
  CONSTRAINT `fk_commentaires_musique` FOREIGN KEY (`musique_id`) REFERENCES `musiques` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. TAB: publicites (Banyè & Anons Komèsyal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `publicites` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `titre` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `image_url` TEXT NOT NULL,
  `media_url` TEXT DEFAULT NULL,
  `media_type` ENUM('image', 'gif', 'video') NOT NULL DEFAULT 'image',
  `lien_url` VARCHAR(512) NOT NULL,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `nom_sponsor` VARCHAR(255) NOT NULL,
  `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. TAB: configurations (Paramèt MonCash, Natcash, Pousantaj)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `configurations` (
  `cle` VARCHAR(64) NOT NULL PRIMARY KEY,
  `valeur` LONGTEXT NOT NULL,
  `date_mise_a_jour` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. TAB: logs_activite (Jounal Aktivite & Tantativ Koneksyon)
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

-- ----------------------------------------------------------
-- 12. TAB: tentatives_connexion (Rate Limiting & Fòs Brit)
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
-- 13. TAB: blocages_securite (Blokaj Tanporè Rate Limiting)
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
-- INSERTIONS INITIALES (Données de démarrage)
-- ----------------------------------------------------------
-- Admin prensipal
INSERT INTO `utilisateurs` (`id`, `nom`, `email`, `mot_de_passe`, `role`, `telephone`, `statut`)
VALUES ('usr_admin_upmizik', 'Super Admin UpMizik', 'upmizik.haiti@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'super_admin', '+50938000000', 'actif')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Konfigirasyon peman
INSERT INTO `configurations` (`cle`, `valeur`) VALUES
('moncash_numero', '38-91-2317'),
('moncash_nom', 'Clauvens EXAUS'),
('natcash_numero', '35-37-1184'),
('natcash_nom', 'Clauvens EXAUS'),
('frais_inscription_usd', '4.99'),
('frais_fixe_don_usd', '0.99'),
('taux_artiste_pourcent', '85'),
('taux_plateforme_pourcent', '15'),
('taux_change_htg', '145.00')
ON DUPLICATE KEY UPDATE `cle` = VALUES(`cle`);

SET FOREIGN_KEY_CHECKS = 1;
