<?php
/**
 * UpMizik - Musics API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere tout mizik oswa filtre pa kategori / atis
// ----------------------------------------------------------
if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $artistId = $_GET['artistId'] ?? null;
    $category = $_GET['category'] ?? null;
    $status = $_GET['status'] ?? null; // 'active', 'pending', 'rejected', 'all'

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM musics WHERE id = ?");
        $stmt->execute([$id]);
        $music = $stmt->fetch();
        if ($music) {
            // Rekipere kredi yo (split sheets)
            $credStmt = $pdo->prepare("SELECT * FROM music_credits WHERE musicId = ?");
            $credStmt->execute([$id]);
            $music['credits'] = $credStmt->fetchAll();
            jsonResponse(['success' => true, 'music' => $music]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Mizik la pa jwenn.'], 404);
        }
    } else {
        $query = "SELECT m.*, a.avatarUrl as artistAvatar FROM musics m LEFT JOIN artists a ON m.artistId = a.id WHERE 1=1";
        $params = [];

        if ($artistId) {
            $query .= " AND m.artistId = ?";
            $params[] = $artistId;
        }

        if ($category && $category !== 'Tout') {
            $query .= " AND m.category = ?";
            $params[] = $category;
        }

        if ($status && $status !== 'all') {
            $query .= " AND m.status = ?";
            $params[] = $status;
        } elseif (!$status) {
            // Pa defo pou itilizatè piblik, sèlman mizik aktif yo afiche
            $query .= " AND m.status = 'active'";
        }

        $query .= " ORDER BY m.listens DESC, m.created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $musics = $stmt->fetchAll();

        // Rekipere kredi pou chak mizik
        if (!empty($musics)) {
            $musicIds = array_column($musics, 'id');
            $inClause = implode(',', array_fill(0, count($musicIds), '?'));
            $creditsStmt = $pdo->prepare("SELECT * FROM music_credits WHERE musicId IN ($inClause)");
            $creditsStmt->execute($musicIds);
            $allCredits = $creditsStmt->fetchAll();

            $creditsMap = [];
            foreach ($allCredits as $cred) {
                $creditsMap[$cred['musicId']][] = $cred;
            }

            foreach ($musics as &$m) {
                $m['credits'] = $creditsMap[$m['id']] ?? [];
            }
        }

        jsonResponse(['success' => true, 'musics' => $musics, 'count' => count($musics)]);
    }
}

// ----------------------------------------------------------
// POST: Ajoute yon nouvo mizik (ak lyen fichye Hostinger)
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['title']) || empty($data['artistId']) || empty($data['audioUrl'])) {
        jsonResponse(['success' => false, 'message' => 'Tit, Atis, ak Fichye Odyo obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'mus_' . time() . '_' . bin2hex(random_bytes(3));
    $title = trim($data['title']);
    $artistId = $data['artistId'];
    $artistName = $data['artistName'] ?? 'Atis UpMizik';
    $feat = $data['feat'] ?? null;
    $category = $data['category'] ?? 'Tout';
    $releaseFormat = $data['releaseFormat'] ?? 'single';
    $albumName = $data['albumName'] ?? null;
    $trackNumber = $data['trackNumber'] ?? 1;
    $coverUrl = $data['coverUrl'] ?? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
    $audioUrl = $data['audioUrl'];
    $duration = (int)($data['duration'] ?? 180);
    $youtubeUrl = $data['youtubeUrl'] ?? null;
    $tiktokUrl = $data['tiktokUrl'] ?? null;
    $instagramUrl = $data['instagramUrl'] ?? null;
    $status = $data['status'] ?? 'active';

    $stmt = $pdo->prepare("
        INSERT INTO musics (
            id, title, artistId, artistName, feat, category, releaseFormat,
            albumName, trackNumber, coverUrl, audioUrl, duration,
            youtubeUrl, tiktokUrl, instagramUrl, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $id, $title, $artistId, $artistName, $feat, $category, $releaseFormat,
        $albumName, $trackNumber, $coverUrl, $audioUrl, $duration,
        $youtubeUrl, $tiktokUrl, $instagramUrl, $status
    ]);

    // Anrejistre Kredi / Split Sheets si genyen
    if (!empty($data['credits']) && is_array($data['credits'])) {
        $credInsert = $pdo->prepare("
            INSERT INTO music_credits (id, musicId, name, artistId, role, percentage, phone, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($data['credits'] as $cred) {
            $credId = !empty($cred['id']) ? $cred['id'] : 'cred_' . time() . '_' . bin2hex(random_bytes(2));
            $credInsert->execute([
                $credId,
                $id,
                $cred['name'] ?? 'Kolaboratè',
                $cred['artistId'] ?? null,
                $cred['role'] ?? 'Featuring',
                $cred['percentage'] ?? 0,
                $cred['phone'] ?? null,
                $cred['notes'] ?? null
            ]);
        }
    }

    jsonResponse([
        'success' => true,
        'message' => 'Mizik la pibliye avèk siksè sou Hostinger.',
        'musicId' => $id,
        'title' => $title
    ], 201);
}

// ----------------------------------------------------------
// PUT: Modifikasyon Mizik / Ogmante Tande / Validasyon Admin
// ----------------------------------------------------------
if ($method === 'PUT') {
    $data = getJsonInput();
    $id = $data['id'] ?? $_GET['id'] ?? null;

    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID mizik la obligatwa.'], 400);
    }

    // A. Aksyon espesifik: Ogmante Tande (Streams Counter)
    if (isset($data['action']) && $data['action'] === 'listen') {
        $stmt = $pdo->prepare("UPDATE musics SET listens = listens + 1 WHERE id = ?");
        $stmt->execute([$id]);

        // Ogmante total kout tande atis la tou
        $artistStmt = $pdo->prepare("
            UPDATE artists a 
            JOIN musics m ON m.artistId = a.id 
            SET a.totalListens = a.totalListens + 1 
            WHERE m.id = ?
        ");
        $artistStmt->execute([$id]);

        jsonResponse(['success' => true, 'message' => 'Kout tande anrejistre.']);
    }

    // B. Aksyon Admin: Valide oswa Refize Mizik
    if (isset($data['status'])) {
        $newStatus = $data['status']; // 'active', 'rejected', 'pending'
        $rejectionReason = $data['rejectionReason'] ?? null;
        $stmt = $pdo->prepare("UPDATE musics SET status = ?, rejectionReason = ? WHERE id = ?");
        $stmt->execute([$newStatus, $rejectionReason, $id]);
        jsonResponse(['success' => true, 'message' => 'Estati mizik la aktyalize.']);
    }

    // C. Modifikasyon Jeneral Metadata
    $allowed = ['title', 'feat', 'category', 'coverUrl', 'audioUrl', 'albumName', 'youtubeUrl', 'tiktokUrl', 'instagramUrl'];
    $updates = [];
    $params = [];
    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $updates[] = "`$field` = ?";
            $params[] = $data[$field];
        }
    }

    if (!empty($updates)) {
        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE musics SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }

    jsonResponse(['success' => true, 'message' => 'Mizik modifye avèk siksè.']);
}

// ----------------------------------------------------------
// DELETE: Efase yon mizik
// ----------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID mizik la obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM musics WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Mizik la efase avèk siksè.']);
}
