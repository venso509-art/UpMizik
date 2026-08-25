<?php
/**
 * UpMizik - Authentication API Endpoint (Hostinger / MySQL)
 * 
 * Sipòte:
 * 1. Koneksyon Atis ak pwoteksyon Rate Limiting & Fòs Brit (Brute Force)
 * 2. Notifikasyon imèl otomatik bay Admin lè gen twòp tantativ echwe
 * 3. Chanje Kòd PIN
 * 4. Verifikasyon Admin
 */

require_once __DIR__ . '/../config/db.php';

// Si gen modil auth.php prensipal la disponib, nou ka rale fonksyon sekirite li yo tou
if (file_exists(__DIR__ . '/../../auth.php')) {
    require_once __DIR__ . '/../../auth.php';
}

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

    // Si fonksyon `authenticateArtist` disponib nan auth.php, itilize li dirèkteman pou rate limiting ak sekirite total
    if (function_exists('authenticateArtist')) {
        $authResult = authenticateArtist($identifier, $pin, $pdo);
        if ($authResult['success']) {
            jsonResponse($authResult, 200);
        } else {
            $httpCode = $authResult['code'] ?? ($authResult['is_rate_limited'] ?? false ? 429 : 401);
            jsonResponse($authResult, $httpCode);
        }
    }

    // Fallback dirèk sou baz done a
    $stmt = $pdo->prepare("
        SELECT * FROM artists 
        WHERE (LOWER(email) = LOWER(?) OR phone = ?)
    ");
    $stmt->execute([$identifier, $identifier]);
    $artist = $stmt->fetch();

    if ($artist && ($artist['pin'] === $pin || password_verify($pin, $artist['pin']))) {
        $artist['isPaidThisMonth'] = (bool)($artist['isPaidThisMonth'] ?? false);
        unset($artist['pin']);
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

    $stmt = $pdo->prepare("SELECT id, pin FROM artists WHERE id = ?");
    $stmt->execute([$artistId]);
    $artist = $stmt->fetch();

    if (!$artist || !($artist['pin'] === $oldPin || password_verify($oldPin, $artist['pin']))) {
        jsonResponse(['success' => false, 'message' => 'Ansyen PIN lan pa kòrèk.'], 401);
    }

    $hashedNewPin = function_exists('password_hash') ? password_hash($newPin, PASSWORD_BCRYPT, ['cost' => 10]) : $newPin;
    $update = $pdo->prepare("UPDATE artists SET pin = ? WHERE id = ?");
    $update->execute([$hashedNewPin, $artistId]);

    jsonResponse(['success' => true, 'message' => 'Kòd PIN ou a chanje avèk siksè.']);
}

// ----------------------------------------------------------
// 3. Verifikasyon Admin (Super Admin)
// ----------------------------------------------------------
if ($action === 'admin_login') {
    $email = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');

    // Default admin verify logic
    if (strtolower($email) === 'upmizik.haiti@gmail.com' && ($password === 'Mizik509@Admin' || $password === 'admin1234')) {
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
