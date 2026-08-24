<?php
/**
 * UpMizik - Security & Intrusion Logs API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// GET: Rekipere tout rapò sekirite yo
if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT 100");
    $logs = $stmt->fetchAll();
    jsonResponse(['success' => true, 'logs' => $logs]);
}

// POST: Anrejistre yon tantativ koneksyon sispèk
if ($method === 'POST') {
    $data = getJsonInput();
    
    $id = !empty($data['id']) ? $data['id'] : 'sec_' . time() . '_' . bin2hex(random_bytes(2));
    $attemptedEmail = $data['attemptedEmail'] ?? 'enkoni';
    $attemptCount = (int)($data['attemptCount'] ?? 1);
    $stage = in_array($data['stage'] ?? 'primary_login', ['primary_login', 'master_key']) ? $data['stage'] : 'primary_login';
    $photoUrl = $data['photoUrl'] ?? null;
    $userAgent = $data['userAgent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown UserAgent');
    $ipPlaceholder = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $status = $data['status'] ?? 'alert';
    $notes = $data['notes'] ?? 'Tantativ koneksyon echwe';
    $unlockToken = $data['unlockToken'] ?? bin2hex(random_bytes(16));

    $stmt = $pdo->prepare("
        INSERT INTO security_logs (id, attemptedEmail, attemptCount, stage, photoUrl, userAgent, ipPlaceholder, status, notes, unlockToken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$id, $attemptedEmail, $attemptCount, $stage, $photoUrl, $userAgent, $ipPlaceholder, $status, $notes, $unlockToken]);

    jsonResponse(['success' => true, 'message' => 'Alèt sekirite anrejistre.', 'logId' => $id]);
}
