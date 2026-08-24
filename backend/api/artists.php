<?php
/**
 * UpMizik - Artists API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere tout atis oswa yon sèl atis
// ----------------------------------------------------------
if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $email = $_GET['email'] ?? null;
    $status = $_GET['status'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM artists WHERE id = ?");
        $stmt->execute([$id]);
        $artist = $stmt->fetch();
        if ($artist) {
            $artist['isPaidThisMonth'] = (bool)$artist['isPaidThisMonth'];
            jsonResponse(['success' => true, 'artist' => $artist]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Atis la pa jwenn.'], 404);
        }
    } elseif ($email) {
        $stmt = $pdo->prepare("SELECT * FROM artists WHERE email = ?");
        $stmt->execute([$email]);
        $artist = $stmt->fetch();
        if ($artist) {
            $artist['isPaidThisMonth'] = (bool)$artist['isPaidThisMonth'];
            jsonResponse(['success' => true, 'artist' => $artist]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Atis la pa jwenn.'], 404);
        }
    } else {
        $query = "SELECT * FROM artists";
        $params = [];
        if ($status && in_array($status, ['pending', 'active', 'rejected', 'suspended'])) {
            $query .= " WHERE status = ?";
            $params[] = $status;
        }
        $query .= " ORDER BY registrationDate DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $artists = $stmt->fetchAll();
        
        foreach ($artists as &$a) {
            $a['isPaidThisMonth'] = (bool)$a['isPaidThisMonth'];
        }
        jsonResponse(['success' => true, 'artists' => $artists, 'count' => count($artists)]);
    }
}

// ----------------------------------------------------------
// POST: Enskripsyon Nouvo Atis (Status: 'pending' pa defo)
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['email']) || empty($data['stageName'])) {
        jsonResponse(['success' => false, 'message' => 'Non sèn ak Imèl obligatwa.'], 400);
    }

    // Tcheke si imèl la deja anrejistre
    $check = $pdo->prepare("SELECT id FROM artists WHERE email = ?");
    $check->execute([$data['email']]);
    if ($check->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Imèl sa a deja itilize pa yon lòt atis.'], 409);
    }

    $id = !empty($data['id']) ? $data['id'] : 'art_' . time() . '_' . bin2hex(random_bytes(3));
    $name = $data['name'] ?? $data['stageName'];
    $stageName = $data['stageName'];
    $email = strtolower(trim($data['email']));
    $phone = $data['phone'] ?? '';
    $city = $data['city'] ?? 'Pòtoprens';
    $pin = $data['pin'] ?? '0000';
    $avatarUrl = $data['avatarUrl'] ?? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
    $bio = $data['bio'] ?? '';
    $musicalRoots = $data['musicalRoots'] ?? '';
    $musicalInfluences = $data['musicalInfluences'] ?? '';
    $artisticVision = $data['artisticVision'] ?? '';
    $artistQuote = $data['artistQuote'] ?? '';
    $status = $data['status'] ?? 'pending';
    $registrationProofUrl = $data['registrationProofUrl'] ?? '';
    $registrationDate = $data['registrationDate'] ?? date('Y-m-d H:i:s');
    $headerBannerUrl = $data['headerBannerUrl'] ?? '';
    $bannerGenreTheme = $data['bannerGenreTheme'] ?? '';

    $stmt = $pdo->prepare("
        INSERT INTO artists (
            id, name, stageName, email, phone, city, pin, avatarUrl, bio,
            musicalRoots, musicalInfluences, artisticVision, artistQuote,
            status, registrationProofUrl, registrationDate, headerBannerUrl, bannerGenreTheme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $id, $name, $stageName, $email, $phone, $city, $pin, $avatarUrl, $bio,
        $musicalRoots, $musicalInfluences, $artisticVision, $artistQuote,
        $status, $registrationProofUrl, $registrationDate, $headerBannerUrl, $bannerGenreTheme
    ]);

    // Kreye yon notifikasyon bwat mesaj pou atis la
    $inboxStmt = $pdo->prepare("
        INSERT INTO artist_inbox (
            id, artistId, artistName, artistEmail, type, subject,
            senderName, senderEmail, recipientEmail, previewText, bodyText, isRead
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ");
    $inboxId = 'msg_' . time() . '_' . bin2hex(random_bytes(3));
    $inboxStmt->execute([
        $inboxId,
        $id,
        $stageName,
        $email,
        'registration_received',
        'Dosye Enskripsyon Atis UpMizik Resevwa',
        'Ekip UpMizik',
        'noreply@upmizik.com',
        $email,
        'Nou resevwa dosye w la epi n ap valide prèv peman $4.99 la...',
        "Bonjou $stageName,\n\nNou byen resevwa fòmilè enskripsyon w sou platfòm UpMizik la. Ekip administrasyon nou an ap verifye prèv transfè w la. Kont ou ap aktive nan kèk minit."
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Enskripsyon anrejistre avèk siksè sou sèvè a.',
        'artistId' => $id,
        'status' => $status
    ], 201);
}

// ----------------------------------------------------------
// PUT: Modifikasyon Atis / Validasyon / Refi pa Admin
// ----------------------------------------------------------
if ($method === 'PUT') {
    $data = getJsonInput();
    $id = $data['id'] ?? $_GET['id'] ?? null;

    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID atis la obligatwa.'], 400);
    }

    // 1. Tcheke si se yon aksyon validasyon / refi pa admin
    if (isset($data['status'])) {
        $newStatus = $data['status']; // 'active' | 'rejected' | 'suspended' | 'pending'
        $rejectionReason = $data['registrationRejectionReason'] ?? $data['reason'] ?? null;
        $suspendedUntil = $data['suspendedUntil'] ?? null;
        $suspensionDays = $data['suspensionDays'] ?? null;
        $suspensionReason = $data['suspensionReason'] ?? null;

        $stmt = $pdo->prepare("
            UPDATE artists SET 
                status = ?,
                registrationRejectionReason = ?,
                suspendedUntil = ?,
                suspensionDays = ?,
                suspensionReason = ?
            WHERE id = ?
        ");
        $stmt->execute([$newStatus, $rejectionReason, $suspendedUntil, $suspensionDays, $suspensionReason, $id]);

        // Si atis la valide, voye notifikasyon nan bwat li
        if ($newStatus === 'active') {
            $artistStmt = $pdo->prepare("SELECT * FROM artists WHERE id = ?");
            $artistStmt->execute([$id]);
            $art = $artistStmt->fetch();

            if ($art) {
                $inboxId = 'msg_val_' . time() . '_' . bin2hex(random_bytes(3));
                $inboxStmt = $pdo->prepare("
                    INSERT INTO artist_inbox (
                        id, artistId, artistName, artistEmail, type, subject,
                        senderName, senderEmail, recipientEmail, previewText, bodyText, isRead
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                ");
                $inboxStmt->execute([
                    $inboxId,
                    $id,
                    $art['stageName'],
                    $art['email'],
                    'account_verified',
                    'Felisitasyon! Kont Atis UpMizik ou a Valide!',
                    'Administrasyon UpMizik',
                    'admin@upmizik.com',
                    $art['email'],
                    'Kont ou aksepte ofisyèlman. Ou ka pibliye mizik ou kounye a.',
                    "Bonjou {$art['stageName']},\n\nNou kontan enfòme w ke prèv peman w lan valide epi kont atis ou a aktif nèt sou UpMizik. Kòmanse pibliye track ou yo epi resevwa donasyon dirèkteman."
                ]);
            }
        }

        jsonResponse([
            'success' => true,
            'message' => 'Estati atis la aktyalize ak siksè.',
            'artistId' => $id,
            'status' => $newStatus
        ]);
    }

    // 2. Modifikasyon jeneral pwofil atis la
    $allowedFields = [
        'name', 'stageName', 'phone', 'city', 'pin', 'avatarUrl', 'bio',
        'musicalRoots', 'musicalInfluences', 'artisticVision', 'artistQuote',
        'youtubeUrl', 'instagramUrl', 'instagramHandle', 'tiktokUrl', 'tiktokHandle',
        'twitterUrl', 'twitterHandle', 'headerBannerUrl', 'bannerGenreTheme',
        'isPaidThisMonth', 'paidDateThisMonth', 'paidAmountThisMonth', 'paidReferenceThisMonth'
    ];

    $updates = [];
    $params = [];
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $updates[] = "`$field` = ?";
            $params[] = $data[$field];
        }
    }

    if (empty($updates)) {
        jsonResponse(['success' => false, 'message' => 'Pa gen okenn done pou modifye.'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE artists SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['success' => true, 'message' => 'Pwofil atis la modifye avèk siksè.']);
}

// ----------------------------------------------------------
// DELETE: Efase yon atis
// ----------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID atis la obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM artists WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Atis la efase avèk siksè.']);
}
