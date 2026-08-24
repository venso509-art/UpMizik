<?php
/**
 * UpMizik - Donations API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere tout donasyon oswa filtre pa atis / estati
// ----------------------------------------------------------
if ($method === 'GET') {
    $artistId = $_GET['artistId'] ?? null;
    $status = $_GET['status'] ?? null;

    $query = "SELECT * FROM donations WHERE 1=1";
    $params = [];

    if ($artistId) {
        $query .= " AND artistId = ?";
        $params[] = $artistId;
    }

    if ($status && in_array($status, ['pending', 'validated', 'rejected'])) {
        $query .= " AND status = ?";
        $params[] = $status;
    }

    $query .= " ORDER BY created_at DESC";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $donations = $stmt->fetchAll();

    jsonResponse(['success' => true, 'donations' => $donations, 'count' => count($donations)]);
}

// ----------------------------------------------------------
// POST: Soumèt yon nouvo Donasyon avèk Prèv Peman sou Hostinger
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    if (empty($data['artistId']) || empty($data['amount']) || empty($data['proofUrl'])) {
        jsonResponse(['success' => false, 'message' => 'Atis, Montan, ak Prèv Peman obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'don_' . time() . '_' . bin2hex(random_bytes(3));
    $musicId = $data['musicId'] ?? '';
    $musicTitle = $data['musicTitle'] ?? 'Donasyon Dirèk Pou Atis';
    $artistId = $data['artistId'];
    $artistName = $data['artistName'] ?? 'Atis UpMizik';
    $amount = (float)$data['amount'];
    $currency = in_array($data['currency'] ?? 'USD', ['USD', 'HTG']) ? $data['currency'] : 'USD';
    $donorName = $data['donorName'] ?? 'Fanatik Anonyme';
    $donorPhone = $data['donorPhone'] ?? '';
    $proofUrl = $data['proofUrl'];
    $paymentMethod = $data['paymentMethod'] ?? 'MonCash';
    $status = $data['status'] ?? 'pending';

    // Kalkile pati atis (85%) ak pati platfòm (15% + 0.99)
    $artistShare = round($amount * 0.85, 2);
    $platformShare = round($amount * 0.15, 2);

    $stmt = $pdo->prepare("
        INSERT INTO donations (
            id, musicId, musicTitle, artistId, artistName, amount, currency,
            donorName, donorPhone, proofUrl, paymentMethod, status,
            artistShare, platformShare
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $id, $musicId, $musicTitle, $artistId, $artistName, $amount, $currency,
        $donorName, $donorPhone, $proofUrl, $paymentMethod, $status,
        $artistShare, $platformShare
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Donasyon soumèt avèk siksè. L ap verifye pa admin.',
        'donationId' => $id,
        'status' => 'pending'
    ], 201);
}

// ----------------------------------------------------------
// PUT: Validasyon oswa Refi Donasyon pa Admin
// ----------------------------------------------------------
if ($method === 'PUT') {
    $data = getJsonInput();
    $id = $data['id'] ?? $_GET['id'] ?? null;
    $accept = $data['accept'] ?? ($data['status'] === 'validated');

    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID donasyon an obligatwa.'], 400);
    }

    $donStmt = $pdo->prepare("SELECT * FROM donations WHERE id = ?");
    $donStmt->execute([$id]);
    $donation = $donStmt->fetch();

    if (!$donation) {
        jsonResponse(['success' => false, 'message' => 'Donasyon an pa jwenn.'], 404);
    }

    $newStatus = $accept ? 'validated' : 'rejected';
    $updateStmt = $pdo->prepare("UPDATE donations SET status = ? WHERE id = ?");
    $updateStmt->execute([$newStatus, $id]);

    if ($accept) {
        // Ogmante total donasyon atis la
        $artistUp = $pdo->prepare("
            UPDATE artists SET totalDonationsReceived = totalDonationsReceived + ? WHERE id = ?
        ");
        $artistUp->execute([$donation['artistShare'], $donation['artistId']]);

        // Si te gen yon mizik lye, ogmante total donasyon mizik la tou
        if (!empty($donation['musicId'])) {
            $musUp = $pdo->prepare("
                UPDATE musics SET totalDonations = totalDonations + ? WHERE id = ?
            ");
            $musUp->execute([$donation['amount'], $donation['musicId']]);
        }

        // Voye notifikasyon nan bwat mesaj atis la
        $artistStmt = $pdo->prepare("SELECT email, stageName FROM artists WHERE id = ?");
        $artistStmt->execute([$donation['artistId']]);
        $art = $artistStmt->fetch();

        if ($art) {
            $inboxId = 'msg_don_' . time() . '_' . bin2hex(random_bytes(3));
            $inboxStmt = $pdo->prepare("
                INSERT INTO artist_inbox (
                    id, artistId, artistName, artistEmail, type, subject,
                    senderName, senderEmail, recipientEmail, previewText, bodyText,
                    donationDetails, isRead
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ");
            
            $donationDetails = json_encode([
                'donationId' => $id,
                'musicTitle' => $donation['musicTitle'],
                'musicId' => $donation['musicId'],
                'donorName' => $donation['donorName'],
                'donorPhone' => $donation['donorPhone'],
                'grossAmount' => (float)$donation['amount'],
                'currency' => $donation['currency'],
                'artistShare85' => (float)$donation['artistShare'],
                'platformShare15' => (float)$donation['platformShare'],
                'validatedAt' => date('Y-m-d H:i:s'),
                'transactionRef' => $id,
                'paymentMethod' => $donation['paymentMethod']
            ], JSON_UNESCAPED_UNICODE);

            $inboxStmt->execute([
                $inboxId,
                $donation['artistId'],
                $art['stageName'],
                $art['email'],
                'donation_received',
                'Ou resevwa yon nouvo donasyon $' . $donation['amount'] . ' ' . $donation['currency'],
                'Finans UpMizik',
                'finance@upmizik.com',
                $art['email'],
                'Yon fanatik voye sipò pou ou: ' . $donation['donorName'],
                "Bonjou {$art['stageName']},\n\nNou kontan enfòme w ke prèv donasyon {$donation['donorName']} an valide. Ou resevwa {$donation['artistShare']} {$donation['currency']} (85%).",
                $donationDetails
            ]);
        }
    }

    jsonResponse([
        'success' => true,
        'message' => $accept ? 'Donasyon an valide avèk siksè.' : 'Donasyon an refize.',
        'donationId' => $id,
        'status' => $newStatus
    ]);
}
