<?php
/**
 * UpMizik - Bulk Sync & Seed Data API Endpoint (Hostinger / MySQL)
 * 
 * Pèmèt migrasyon ak senkronizasyon tout done inisyal yo dirèkteman nan MySQL
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Sèlman POST aksepte pou senkronizasyon.'], 405);
}

$data = getJsonInput();

// 1. Senkronize Atis yo
if (!empty($data['artists']) && is_array($data['artists'])) {
    $artStmt = $pdo->prepare("
        INSERT INTO artists (
            id, name, stageName, email, phone, city, pin, avatarUrl, bio,
            musicalRoots, musicalInfluences, artisticVision, artistQuote,
            status, registrationProofUrl, registrationDate, totalListens, totalDonationsReceived,
            headerBannerUrl, bannerGenreTheme, isPaidThisMonth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            stageName = VALUES(stageName),
            phone = VALUES(phone),
            city = VALUES(city),
            pin = VALUES(pin),
            avatarUrl = VALUES(avatarUrl),
            bio = VALUES(bio),
            status = VALUES(status),
            totalListens = VALUES(totalListens),
            totalDonationsReceived = VALUES(totalDonationsReceived),
            headerBannerUrl = VALUES(headerBannerUrl),
            isPaidThisMonth = VALUES(isPaidThisMonth)
    ");

    foreach ($data['artists'] as $a) {
        $artStmt->execute([
            $a['id'],
            $a['name'] ?? $a['stageName'],
            $a['stageName'],
            $a['email'],
            $a['phone'] ?? '',
            $a['city'] ?? 'Pòtoprens',
            $a['pin'] ?? '0000',
            $a['avatarUrl'] ?? '',
            $a['bio'] ?? '',
            $a['musicalRoots'] ?? null,
            $a['musicalInfluences'] ?? null,
            $a['artisticVision'] ?? null,
            $a['artistQuote'] ?? null,
            $a['status'] ?? 'active',
            $a['registrationProofUrl'] ?? null,
            $a['registrationDate'] ?? date('Y-m-d H:i:s'),
            $a['totalListens'] ?? 0,
            $a['totalDonationsReceived'] ?? 0,
            $a['headerBannerUrl'] ?? null,
            $a['bannerGenreTheme'] ?? null,
            !empty($a['isPaidThisMonth']) ? 1 : 0
        ]);
    }
}

// 2. Senkronize Mizik yo
if (!empty($data['musics']) && is_array($data['musics'])) {
    $musStmt = $pdo->prepare("
        INSERT INTO musics (
            id, title, artistId, artistName, feat, category, releaseFormat,
            albumName, trackNumber, coverUrl, audioUrl, duration,
            listens, totalDonations, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            artistName = VALUES(artistName),
            feat = VALUES(feat),
            category = VALUES(category),
            releaseFormat = VALUES(releaseFormat),
            coverUrl = VALUES(coverUrl),
            audioUrl = VALUES(audioUrl),
            duration = VALUES(duration),
            listens = VALUES(listens),
            totalDonations = VALUES(totalDonations),
            status = VALUES(status)
    ");

    foreach ($data['musics'] as $m) {
        // Asire atis la egziste dabò pou evite foreign key constraint error
        $chk = $pdo->prepare("SELECT id FROM artists WHERE id = ?");
        $chk->execute([$m['artistId']]);
        if (!$chk->fetch()) {
            $createArt = $pdo->prepare("
                INSERT INTO artists (id, name, stageName, email, phone, status)
                VALUES (?, ?, ?, ?, '50900000000', 'active')
            ");
            $createArt->execute([
                $m['artistId'],
                $m['artistName'] ?? 'Atis UpMizik',
                $m['artistName'] ?? 'Atis UpMizik',
                'artist_' . $m['artistId'] . '@upmizik.com'
            ]);
        }

        $musStmt->execute([
            $m['id'],
            $m['title'],
            $m['artistId'],
            $m['artistName'] ?? 'Atis',
            $m['feat'] ?? null,
            $m['category'] ?? 'Tout',
            $m['releaseFormat'] ?? 'single',
            $m['albumName'] ?? null,
            $m['trackNumber'] ?? 1,
            $m['coverUrl'],
            $m['audioUrl'],
            $m['duration'] ?? 180,
            $m['listens'] ?? 0,
            $m['totalDonations'] ?? 0,
            $m['status'] ?? 'active'
        ]);
    }
}

// 3. Senkronize Piblisite (Pubs)
if (!empty($data['pubs']) && is_array($data['pubs'])) {
    $pubStmt = $pdo->prepare("
        INSERT INTO pubs (id, title, description, imageUrl, linkUrl, active, sponsorName)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            imageUrl = VALUES(imageUrl),
            linkUrl = VALUES(linkUrl),
            active = VALUES(active),
            sponsorName = VALUES(sponsorName)
    ");
    foreach ($data['pubs'] as $p) {
        $pubStmt->execute([
            $p['id'],
            $p['title'],
            $p['description'] ?? '',
            $p['imageUrl'],
            $p['linkUrl'] ?? '#',
            !empty($p['active']) ? 1 : 0,
            $p['sponsorName'] ?? 'Sponsor'
        ]);
    }
}

// 4. Senkronize RPA
if (!empty($data['rpa']) && is_array($data['rpa'])) {
    $rpaStmt = $pdo->prepare("
        INSERT INTO rpa (id, title, description, artistName, imageUrl, socialLink, youtubeUrl, badgeText)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            artistName = VALUES(artistName),
            imageUrl = VALUES(imageUrl),
            socialLink = VALUES(socialLink),
            youtubeUrl = VALUES(youtubeUrl),
            badgeText = VALUES(badgeText)
    ");
    foreach ($data['rpa'] as $r) {
        $rpaStmt->execute([
            $r['id'],
            $r['title'],
            $r['description'] ?? '',
            $r['artistName'],
            $r['imageUrl'],
            $r['socialLink'] ?? '#',
            $r['youtubeUrl'] ?? null,
            $r['badgeText'] ?? 'Révélation'
        ]);
    }
}

jsonResponse(['success' => true, 'message' => 'Tout done yo senkronize avèk siksè nan MySQL!']);
