<?php
/**
 * UpMizik - Artist Inbox API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere tout mesaj bwat yon atis
// ----------------------------------------------------------
if ($method === 'GET') {
    $artistId = $_GET['artistId'] ?? null;
    if (!$artistId) {
        jsonResponse(['success' => false, 'message' => 'artistId obligatwa.'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT * FROM artist_inbox 
        WHERE artistId = ? 
        ORDER BY receivedAt DESC
    ");
    $stmt->execute([$artistId]);
    $messages = $stmt->fetchAll();

    foreach ($messages as &$msg) {
        $msg['isRead'] = (bool)$msg['isRead'];
        $msg['isStarred'] = (bool)$msg['isStarred'];
        if (!empty($msg['musicDetails'])) {
            $msg['musicDetails'] = json_decode($msg['musicDetails'], true);
        }
        if (!empty($msg['awardDetails'])) {
            $msg['awardDetails'] = json_decode($msg['awardDetails'], true);
        }
        if (!empty($msg['donationDetails'])) {
            $msg['donationDetails'] = json_decode($msg['donationDetails'], true);
        }
    }

    jsonResponse(['success' => true, 'messages' => $messages, 'count' => count($messages)]);
}

// ----------------------------------------------------------
// POST: Voye yon nouvo mesaj nan bwat yon atis
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['artistId']) || empty($data['subject'])) {
        jsonResponse(['success' => false, 'message' => 'artistId ak subject obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'msg_' . time() . '_' . bin2hex(random_bytes(3));
    $artistId = $data['artistId'];
    $artistName = $data['artistName'] ?? 'Atis';
    $artistEmail = $data['artistEmail'] ?? '';
    $type = $data['type'] ?? 'system_alert';
    $subject = $data['subject'];
    $senderName = $data['senderName'] ?? 'Ekip UpMizik';
    $senderEmail = $data['senderEmail'] ?? 'admin@upmizik.com';
    $recipientEmail = $data['recipientEmail'] ?? $artistEmail;
    $previewText = $data['previewText'] ?? substr($data['bodyText'] ?? '', 0, 80);
    $bodyText = $data['bodyText'] ?? '';
    $musicDetails = !empty($data['musicDetails']) ? json_encode($data['musicDetails'], JSON_UNESCAPED_UNICODE) : null;
    $awardDetails = !empty($data['awardDetails']) ? json_encode($data['awardDetails'], JSON_UNESCAPED_UNICODE) : null;
    $donationDetails = !empty($data['donationDetails']) ? json_encode($data['donationDetails'], JSON_UNESCAPED_UNICODE) : null;

    $stmt = $pdo->prepare("
        INSERT INTO artist_inbox (
            id, artistId, artistName, artistEmail, type, subject,
            senderName, senderEmail, recipientEmail, previewText, bodyText,
            musicDetails, awardDetails, donationDetails, isRead, isStarred
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    ");

    $stmt->execute([
        $id, $artistId, $artistName, $artistEmail, $type, $subject,
        $senderName, $senderEmail, $recipientEmail, $previewText, $bodyText,
        $musicDetails, $awardDetails, $donationDetails
    ]);

    jsonResponse(['success' => true, 'message' => 'Mesaj voye avèk siksè.', 'messageId' => $id], 201);
}

// ----------------------------------------------------------
// PUT: Make mesaj kòm Li (isRead) oswa Starred
// ----------------------------------------------------------
if ($method === 'PUT') {
    $data = getJsonInput();
    $id = $data['id'] ?? $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID mesaj la obligatwa.'], 400);
    }

    $updates = [];
    $params = [];
    if (isset($data['isRead'])) {
        $updates[] = "isRead = ?";
        $params[] = $data['isRead'] ? 1 : 0;
    }
    if (isset($data['isStarred'])) {
        $updates[] = "isStarred = ?";
        $params[] = $data['isStarred'] ? 1 : 0;
    }

    if (!empty($updates)) {
        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE artist_inbox SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }

    jsonResponse(['success' => true, 'message' => 'Mesaj aktyalize.']);
}

// ----------------------------------------------------------
// DELETE: Efase yon mesaj
// ----------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID mesaj la obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM artist_inbox WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Mesaj efase avèk siksè.']);
}
