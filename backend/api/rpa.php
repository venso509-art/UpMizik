<?php
/**
 * UpMizik - RPA (Révélation & Pwojè Atis) API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// GET: Rekipere lis RPA
if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM rpa ORDER BY created_at DESC");
    $rpaList = $stmt->fetchAll();
    jsonResponse(['success' => true, 'rpa' => $rpaList]);
}

// POST: Ajoute oswa modifye RPA
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['title']) || empty($data['artistName'])) {
        jsonResponse(['success' => false, 'message' => 'Tit ak Non Atis obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'rpa_' . time() . '_' . bin2hex(random_bytes(2));
    $title = $data['title'];
    $description = $data['description'] ?? '';
    $artistName = $data['artistName'];
    $imageUrl = $data['imageUrl'] ?? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
    $mediaUrl = $data['mediaUrl'] ?? null;
    $mediaType = in_array($data['mediaType'] ?? 'image', ['image', 'gif', 'video']) ? $data['mediaType'] : 'image';
    $socialLink = $data['socialLink'] ?? '#';
    $youtubeUrl = $data['youtubeUrl'] ?? null;
    $badgeText = $data['badgeText'] ?? 'Révélation du mois';

    $stmt = $pdo->prepare("
        INSERT INTO rpa (id, title, description, artistName, imageUrl, mediaUrl, mediaType, socialLink, youtubeUrl, badgeText)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            artistName = VALUES(artistName),
            imageUrl = VALUES(imageUrl),
            mediaUrl = VALUES(mediaUrl),
            mediaType = VALUES(mediaType),
            socialLink = VALUES(socialLink),
            youtubeUrl = VALUES(youtubeUrl),
            badgeText = VALUES(badgeText)
    ");
    $stmt->execute([$id, $title, $description, $artistName, $imageUrl, $mediaUrl, $mediaType, $socialLink, $youtubeUrl, $badgeText]);

    jsonResponse(['success' => true, 'message' => 'RPA anrejistre avèk siksè.', 'rpaId' => $id]);
}

// DELETE: Efase RPA
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM rpa WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'RPA efase.']);
}
