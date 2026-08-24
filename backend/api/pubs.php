<?php
/**
 * UpMizik - Ads & Commercial Banners API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// GET: Rekipere tout piblisite yo
if ($method === 'GET') {
    $activeOnly = isset($_GET['active']) && $_GET['active'] === '1';
    $sql = "SELECT * FROM pubs";
    if ($activeOnly) {
        $sql .= " WHERE active = 1";
    }
    $sql .= " ORDER BY created_at DESC";
    $stmt = $pdo->query($sql);
    $pubs = $stmt->fetchAll();
    foreach ($pubs as &$p) {
        $p['active'] = (bool)$p['active'];
    }
    jsonResponse(['success' => true, 'pubs' => $pubs]);
}

// POST: Ajoute oswa modifye piblisite
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['title']) || empty($data['imageUrl'])) {
        jsonResponse(['success' => false, 'message' => 'Tit ak Imaj obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'pub_' . time() . '_' . bin2hex(random_bytes(2));
    $title = $data['title'];
    $description = $data['description'] ?? '';
    $imageUrl = $data['imageUrl'];
    $mediaUrl = $data['mediaUrl'] ?? null;
    $mediaType = in_array($data['mediaType'] ?? 'image', ['image', 'gif', 'video']) ? $data['mediaType'] : 'image';
    $linkUrl = $data['linkUrl'] ?? '#';
    $active = isset($data['active']) ? ($data['active'] ? 1 : 0) : 1;
    $sponsorName = $data['sponsorName'] ?? 'Patnè UpMizik';

    $stmt = $pdo->prepare("
        INSERT INTO pubs (id, title, description, imageUrl, mediaUrl, mediaType, linkUrl, active, sponsorName)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            imageUrl = VALUES(imageUrl),
            mediaUrl = VALUES(mediaUrl),
            mediaType = VALUES(mediaType),
            linkUrl = VALUES(linkUrl),
            active = VALUES(active),
            sponsorName = VALUES(sponsorName)
    ");
    $stmt->execute([$id, $title, $description, $imageUrl, $mediaUrl, $mediaType, $linkUrl, $active, $sponsorName]);

    jsonResponse(['success' => true, 'message' => 'Piblisite anrejistre.', 'pubId' => $id]);
}

// DELETE: Efase piblisite
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM pubs WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Piblisite efase.']);
}
