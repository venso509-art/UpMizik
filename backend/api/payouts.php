<?php
/**
 * UpMizik - Payouts & Earnings API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere rapò peman pou tout atis
// ----------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT 
            a.id, a.name, a.stageName, a.email, a.phone, a.avatarUrl,
            a.totalDonationsReceived, a.isPaidThisMonth, a.paidDateThisMonth,
            a.paidAmountThisMonth, a.paidReferenceThisMonth,
            COUNT(d.id) as donationCount,
            COALESCE(SUM(d.amount), 0) as totalGrossDonations,
            COALESCE(SUM(d.artistShare), 0) as calculatedArtistShare,
            COALESCE(SUM(d.platformShare), 0) as calculatedPlatformShare
        FROM artists a
        LEFT JOIN donations d ON d.artistId = a.id AND d.status = 'validated'
        GROUP BY a.id
        ORDER BY calculatedArtistShare DESC
    ");
    $payouts = $stmt->fetchAll();

    foreach ($payouts as &$p) {
        $p['isPaidThisMonth'] = (bool)$p['isPaidThisMonth'];
    }

    jsonResponse(['success' => true, 'payouts' => $payouts]);
}

// ----------------------------------------------------------
// POST: Make yon peman kòm Fè (Payout Executed)
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    $artistId = $data['artistId'] ?? null;
    $amount = (float)($data['amount'] ?? 0);
    $reference = trim($data['reference'] ?? 'MC-' . time());
    $isPaid = isset($data['isPaid']) ? (bool)$data['isPaid'] : true;

    if (!$artistId) {
        jsonResponse(['success' => false, 'message' => 'artistId obligatwa.'], 400);
    }

    $stmt = $pdo->prepare("
        UPDATE artists SET 
            isPaidThisMonth = ?,
            paidDateThisMonth = ?,
            paidAmountThisMonth = ?,
            paidReferenceThisMonth = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $isPaid ? 1 : 0,
        $isPaid ? date('Y-m-d H:i:s') : null,
        $isPaid ? $amount : null,
        $isPaid ? $reference : null,
        $artistId
    ]);

    jsonResponse(['success' => true, 'message' => 'Estati peman anrejistre avèk siksè.']);
}
