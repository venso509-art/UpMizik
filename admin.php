<?php
/**
 * UpMizik - Pano Administrasyon (PHP / MySQL / Hostinger)
 * Pèmèt valide atis (pase de 'en_attente' pou vin 'actif'), donasyon, ak mizik.
 */
require_once __DIR__ . '/config.php';

if (empty($_SESSION['is_admin'])) {
    // Si li pa konekte kòm admin, redireksyone sou paj koneksyon an
    // Pou fasilite tès la, si li pase ?admin_key=upmizik509 nou ka louvri sesyon an
    if (isset($_GET['admin_key']) && $_GET['admin_key'] === 'upmizik509') {
        $_SESSION['is_admin'] = true;
    } else {
        header('Location: connexion.php');
        exit;
    }
}

$db = getDB();
$message = '';
$error = '';

// Aksyon Admin (Validasyon / Rejè)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $db) {
    $action = $_POST['action'] ?? '';
    $targetId = $_POST['target_id'] ?? '';

    try {
        if ($action === 'valider_artiste' && $targetId) {
            $stmt = $db->prepare("UPDATE artistes SET statut = 'actif' WHERE id = ?");
            $stmt->execute([$targetId]);
            $message = "Atis $targetId valide avèk siksè kòm 'actif'!";
        } elseif ($action === 'rejeter_artiste' && $targetId) {
            $stmt = $db->prepare("UPDATE artistes SET statut = 'rejete' WHERE id = ?");
            $stmt->execute([$targetId]);
            $message = "Atis $targetId rejte.";
        } elseif ($action === 'valider_don' && $targetId) {
            $stmt = $db->prepare("UPDATE dons SET statut = 'valide' WHERE id = ?");
            $stmt->execute([$targetId]);

            // Mete ajou total donasyon atis la
            $donStmt = $db->prepare("SELECT artiste_id, part_artiste FROM dons WHERE id = ?");
            $donStmt->execute([$targetId]);
            $d = $donStmt->fetch();
            if ($d && $d['artiste_id']) {
                $db->prepare("UPDATE artistes SET total_dons_recus = total_dons_recus + ? WHERE id = ?")
                   ->execute([$d['part_artiste'], $d['artiste_id']]);
            }
            $message = "Donasyon $targetId valide!";
        } elseif ($action === 'valider_musique' && $targetId) {
            $stmt = $db->prepare("UPDATE musiques SET statut = 'actif' WHERE id = ?");
            $stmt->execute([$targetId]);
            $message = "Mizik $targetId valide!";
        }
    } catch (Exception $e) {
        $error = "Erè: " . $e->getMessage();
    }
}

// Rekipere done pou admin
$pendingArtists = [];
$activeArtists = [];
$pendingDons = [];
$recentMusics = [];
$totalStats = ['artists' => 0, 'musics' => 0, 'dons' => 0, 'total_money' => 0];

if ($db) {
    try {
        $pendingArtists = $db->query("SELECT * FROM artistes WHERE statut = 'en_attente' ORDER BY date_inscription DESC")->fetchAll();
        $activeArtists = $db->query("SELECT * FROM artistes WHERE statut = 'actif' ORDER BY date_inscription DESC LIMIT 20")->fetchAll();
        $pendingDons = $db->query("SELECT * FROM dons WHERE statut = 'en_attente' ORDER BY date_don DESC")->fetchAll();
        $recentMusics = $db->query("SELECT * FROM musiques ORDER BY date_creation DESC LIMIT 15")->fetchAll();

        $cArt = $db->query("SELECT COUNT(*) as c FROM artistes")->fetch();
        $cMus = $db->query("SELECT COUNT(*) as c FROM musiques")->fetch();
        $cDon = $db->query("SELECT COUNT(*) as c, SUM(montant) as total FROM dons WHERE statut = 'valide'")->fetch();

        $totalStats['artists'] = $cArt['c'] ?? 0;
        $totalStats['musics'] = $cMus['c'] ?? 0;
        $totalStats['dons'] = $cDon['c'] ?? 0;
        $totalStats['total_money'] = $cDon['total'] ?? 0;
    } catch (Exception $e) {}
}
?>
<!DOCTYPE html>
<html lang="ht" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pano Admin - UpMizik Hostinger</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-display { font-family: 'Cabinet Grotesk', sans-serif; }
    </style>
</head>
<body class="bg-[#05070a] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-red-600 selection:text-white pb-20">

    <!-- HEADER -->
    <header class="sticky top-0 z-40 bg-[#080d14]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <a href="index.php" class="flex items-center gap-2">
                <span class="font-display text-2xl font-black text-white">Up<span class="text-red-500">Mizik</span></span>
                <span class="px-2 py-0.5 rounded-md bg-red-600/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">Admin Hostinger</span>
            </a>
        </div>
        <div class="flex items-center gap-3">
            <a href="index.php" class="px-3.5 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-slate-300 border border-slate-800">Sit Piblik</a>
            <a href="connexion.php" class="px-3.5 py-1.5 rounded-xl bg-red-600/20 text-xs font-bold text-red-400 border border-red-500/20">Dekonekte</a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <?php if (!empty($message)): ?>
            <div class="p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-base"></i>
                <span><?= htmlspecialchars($message) ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-base"></i>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <!-- STATISTIK GLOBALE -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span class="text-xs text-slate-400 block mb-1">Total Atis</span>
                <span class="text-2xl font-black font-display text-white"><?= number_format($totalStats['artists']) ?></span>
            </div>
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span class="text-xs text-slate-400 block mb-1">Total Mizik</span>
                <span class="text-2xl font-black font-display text-red-400"><?= number_format($totalStats['musics']) ?></span>
            </div>
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span class="text-xs text-slate-400 block mb-1">Donasyon Valide</span>
                <span class="text-2xl font-black font-display text-amber-400"><?= number_format($totalStats['dons']) ?></span>
            </div>
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span class="text-xs text-slate-400 block mb-1">Lajan Kolekte</span>
                <span class="text-2xl font-black font-display text-green-400">$<?= number_format($totalStats['total_money'], 2) ?></span>
            </div>
        </div>

        <!-- ATIS AN ATANT VALIDASYON (PENDING -> ACTIVE) -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
                    <h2 class="font-display text-lg font-bold text-white">Atis An Atant Validasyon ($4.99)</h2>
                </div>
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold"><?= count($pendingArtists) ?> atis</span>
            </div>

            <?php if (empty($pendingArtists)): ?>
                <p class="text-xs text-slate-500">Pa gen okenn atis ki an atant validasyon kounye a.</p>
            <?php else: ?>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-slate-800 text-slate-400">
                                <th class="pb-3 font-semibold">Atis</th>
                                <th class="pb-3 font-semibold">Kontak</th>
                                <th class="pb-3 font-semibold">PIN</th>
                                <th class="pb-3 font-semibold">Prèv $4.99</th>
                                <th class="pb-3 font-semibold text-right">Aksyon</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            <?php foreach ($pendingArtists as $art): ?>
                                <tr>
                                    <td class="py-3 font-bold text-white">
                                        <div class="flex items-center gap-2.5">
                                            <img src="<?= htmlspecialchars($art['avatar_url'] ?: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100') ?>" class="w-8 h-8 rounded-full object-cover">
                                            <div>
                                                <div><?= htmlspecialchars($art['nom_scene']) ?></div>
                                                <div class="text-[10px] text-slate-400"><?= htmlspecialchars($art['nom_complet']) ?></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3 text-slate-300">
                                        <div><?= htmlspecialchars($art['email']) ?></div>
                                        <div class="text-[10px] text-slate-400"><?= htmlspecialchars($art['telephone']) ?></div>
                                    </td>
                                    <td class="py-3 font-mono font-bold text-amber-400"><?= htmlspecialchars($art['pin']) ?></td>
                                    <td class="py-3">
                                        <?php if (!empty($art['preuve_inscription_url'])): ?>
                                            <a href="<?= htmlspecialchars($art['preuve_inscription_url']) ?>" target="_blank" class="text-xs text-red-400 hover:underline font-semibold flex items-center gap-1">
                                                <i class="fa-solid fa-file-image"></i> Gade Prèv
                                            </a>
                                        <?php else: ?>
                                            <span class="text-slate-500">Pa gen prèv</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="py-3 text-right">
                                        <form action="admin.php" method="POST" class="inline-flex items-center gap-2">
                                            <input type="hidden" name="target_id" value="<?= htmlspecialchars($art['id']) ?>">
                                            <button type="submit" name="action" value="valider_artiste" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition">
                                                <i class="fa-solid fa-check mr-1"></i> Valide (Active)
                                            </button>
                                            <button type="submit" name="action" value="rejeter_artiste" class="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold transition">
                                                <i class="fa-solid fa-xmark"></i>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- DONASYON AN ATANT VALIDASYON -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-green-400"></div>
                    <h2 class="font-display text-lg font-bold text-white">Donasyon An Atant Validasyon</h2>
                </div>
                <span class="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold"><?= count($pendingDons) ?> don</span>
            </div>

            <?php if (empty($pendingDons)): ?>
                <p class="text-xs text-slate-500">Pa gen okenn don ki an atant validasyon.</p>
            <?php else: ?>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-slate-800 text-slate-400">
                                <th class="pb-3 font-semibold">Donatè</th>
                                <th class="pb-3 font-semibold">Atis / Mizik</th>
                                <th class="pb-3 font-semibold">Montan</th>
                                <th class="pb-3 font-semibold">Prèv</th>
                                <th class="pb-3 font-semibold text-right">Aksyon</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            <?php foreach ($pendingDons as $don): ?>
                                <tr>
                                    <td class="py-3 font-bold text-white">
                                        <div><?= htmlspecialchars($don['nom_donateur']) ?></div>
                                        <div class="text-[10px] text-slate-400"><?= htmlspecialchars($don['telephone_donateur']) ?> • <?= htmlspecialchars($don['methode_paiement']) ?></div>
                                    </td>
                                    <td class="py-3 text-slate-300">
                                        <div class="font-semibold text-red-400"><?= htmlspecialchars($don['nom_artiste']) ?></div>
                                        <div class="text-[10px] text-slate-500"><?= htmlspecialchars($don['titre_musique']) ?></div>
                                    </td>
                                    <td class="py-3 font-mono font-bold text-emerald-400">
                                        $<?= number_format($don['montant'], 2) ?> <?= htmlspecialchars($don['devise']) ?>
                                    </td>
                                    <td class="py-3">
                                        <a href="<?= htmlspecialchars($don['preuve_url']) ?>" target="_blank" class="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1">
                                            <i class="fa-solid fa-receipt"></i> Gade Prèv
                                        </a>
                                    </td>
                                    <td class="py-3 text-right">
                                        <form action="admin.php" method="POST" class="inline-flex items-center gap-2">
                                            <input type="hidden" name="target_id" value="<?= htmlspecialchars($don['id']) ?>">
                                            <button type="submit" name="action" value="valider_don" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition">
                                                <i class="fa-solid fa-check mr-1"></i> Valide Don
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

    </main>
</body>
</html>
