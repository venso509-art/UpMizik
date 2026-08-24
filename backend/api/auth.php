<?php
/**
 * UpMizik - Authentication API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Sèlman POST aksepte pou otantifikasyon.'], 405);
}

$data = getJsonInput();
$action = $data['action'] ?? $_GET['action'] ?? 'login';

// ----------------------------------------------------------
// 1. Koneksyon Atis (Login ak Email/Telefòn + PIN 4 chif)
// ----------------------------------------------------------
if ($action === 'login') {
    $identifier = trim($data['identifier'] ?? $data['email'] ?? $data['phone'] ?? '');
    $pin = trim($data['pin'] ?? '');

    if (empty($identifier) || empty($pin)) {
        jsonResponse(['success' => false, 'message' => 'Imèl/Telefòn ak Kòd PIN obligatwa.'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT * FROM artists 
        WHERE (LOWER(email) = LOWER(?) OR phone = ?) AND pin = ?
    ");
    $stmt->execute([$identifier, $identifier, $pin]);
    $artist = $stmt->fetch();

    if ($artist) {
        $artist['isPaidThisMonth'] = (bool)$artist['isPaidThisMonth'];
        jsonResponse([
            'success' => true,
            'message' => 'Koneksyon reyisi!',
            'artist' => $artist
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Imèl oswa Kòd PIN pa kòrèk.'], 401);
    }
}

// ----------------------------------------------------------
// 2. Chanje Kòd PIN Atis
// ----------------------------------------------------------
if ($action === 'change_pin') {
    $artistId = $data['artistId'] ?? null;
    $oldPin = $data['oldPin'] ?? '';
    $newPin = $data['newPin'] ?? '';

    if (!$artistId || strlen($newPin) < 4) {
        jsonResponse(['success' => false, 'message' => 'Nouvo PIN lan dwe gen omwen 4 chif.'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM artists WHERE id = ? AND pin = ?");
    $stmt->execute([$artistId, $oldPin]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Ansyen PIN lan pa kòrèk.'], 401);
    }

    $update = $pdo->prepare("UPDATE artists SET pin = ? WHERE id = ?");
    $update->execute([$newPin, $artistId]);

    jsonResponse(['success' => true, 'message' => 'Kòd PIN ou a chanje avèk siksè.']);
}

// ----------------------------------------------------------
// 3. Verifikasyon Admin (Super Admin)
// ----------------------------------------------------------
if ($action === 'admin_login') {
    $email = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');

    // Default admin verify logic
    if (strtolower($email) === 'upmizik.haiti@gmail.com' && $password === 'Mizik509@Admin') {
        jsonResponse([
            'success' => true,
            'message' => 'Otantifikasyon Admin reyisi.',
            'admin' => [
                'email' => 'upmizik.haiti@gmail.com',
                'name' => 'Super Admin UpMizik',
                'role' => 'super_admin'
            ]
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Kredansyèl admin pa kòrèk.'], 401);
    }
}

jsonResponse(['success' => false, 'message' => 'Aksyon sa a pa rekonèt.'], 400);
