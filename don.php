<?php
/**
 * UpMizik - Fòmilè Donasyon & Prèv Peman (PHP / MySQL / Hostinger)
 */
require_once __DIR__ . '/config.php';

$message = '';
$error = '';
$db = getDB();

$selectedMusiqueId = $_GET['musique_id'] ?? '';
$selectedArtistId = $_GET['artiste_id'] ?? '';
$musiqueObj = null;
$artistObj = null;

if ($db) {
    try {
        if ($selectedMusiqueId) {
            $stmt = $db->prepare("SELECT * FROM musiques WHERE id = ?");
            $stmt->execute([$selectedMusiqueId]);
            $musiqueObj = $stmt->fetch();
            if ($musiqueObj) {
                $selectedArtistId = $musiqueObj['artiste_id'];
            }
        }
        if ($selectedArtistId) {
            $stmt2 = $db->prepare("SELECT * FROM artistes WHERE id = ?");
            $stmt2->execute([$selectedArtistId]);
            $artistObj = $stmt2->fetch();
        }
    } catch (Exception $e) {}
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $artisteId = trim($_POST['artiste_id'] ?? '');
    $musiqueId = trim($_POST['musique_id'] ?? '');
    $nomArtiste = trim($_POST['nom_artiste'] ?? 'Atis UpMizik');
    $titreMusique = trim($_POST['titre_musique'] ?? 'Donasyon Dirèk');
    $montant = floatval($_POST['montant'] ?? 1.00);
    $devise = trim($_POST['devise'] ?? 'USD');
    $nomDonateur = trim($_POST['nom_donateur'] ?? '');
    $telephoneDonateur = trim($_POST['telephone_donateur'] ?? '');
    $methode = trim($_POST['methode'] ?? 'MonCash');

    if ($montant <= 0 || empty($nomDonateur) || empty($telephoneDonateur)) {
        $error = 'Tanpri ranpli tout chan obligatwa yo.';
    } elseif (!isset($_FILES['preuve_file']) || $_FILES['preuve_file']['error'] !== UPLOAD_ERR_OK) {
        $error = 'Tanpri telechaje yon foto prèv transfè MonCash oswa Natcash.';
    } else {
        // Telechaje foto prèv la sou sèvè a nan /uploads/preuves/
        $uploadRes = uploadServerFile($_FILES['preuve_file'], 'preuves');

        if (!$uploadRes['success']) {
            $error = $uploadRes['message'];
        } else {
            $preuveUrl = $uploadRes['url'];
            $partArtiste = round($montant * 0.85, 2);
            $partPlateforme = round($montant * 0.15, 2);
            $donId = 'don_' . time() . '_' . bin2hex(random_bytes(3));

            if ($db) {
                try {
                    $insertDon = $db->prepare("
                        INSERT INTO dons (id, musique_id, titre_musique, artiste_id, nom_artiste, montant, devise, nom_donateur, telephone_donateur, preuve_url, methode_paiement, statut, part_artiste, part_plateforme)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?, ?)
                    ");
                    $insertDon->execute([
                        $donId, $musiqueId, $titreMusique, $artisteId, $nomArtiste, $montant, $devise, $nomDonateur, $telephoneDonateur, $preuveUrl, $methode, $partArtiste, $partPlateforme
                    ]);

                    $message = 'Mèsi anpil pou sipò w! Prèv transfè a anrejistre sou sèvè a epi admin lan pral valide don an trè byento.';
                } catch (Exception $e) {
                    $error = 'Erè pandan anrejistreman don an: ' . $e->getMessage();
                }
            } else {
                $message = 'Prèv transfè a anrejistre nan /uploads/preuves/ sou sèvè Hostinger a!';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ht" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sipòte Atis - UpMizik Hostinger</title>
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
<body class="bg-[#05070a] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-red-600 selection:text-white pb-16">

    <!-- HEADER -->
    <header class="sticky top-0 z-40 bg-[#080d14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <a href="index.php" class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <i class="fa-solid fa-play text-white text-base"></i>
            </div>
            <span class="font-display text-2xl font-extrabold text-white">Up<span class="text-red-500">Mizik</span></span>
        </a>
        <nav class="flex items-center gap-2">
            <a href="index.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Akèy</a>
            <a href="artistes.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Atis</a>
        </nav>
    </header>

    <main class="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div class="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                </div>
                <div>
                    <h1 class="font-display text-2xl font-bold text-white">Sipòte Atis Ou Renmen An</h1>
                    <p class="text-xs text-slate-400">Atis la resevwa 85% nan tout kòb ou voye a dirèkteman.</p>
                </div>
            </div>

            <!-- ENFÒMASYON KONT MONCASH / NATCASH -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div class="p-4 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-xs">MC</div>
                    <div>
                        <h4 class="font-bold text-sm text-white">MonCash (Digicel)</h4>
                        <p class="text-xs text-red-300 font-mono font-bold mt-0.5">38-91-2317</p>
                        <p class="text-[11px] text-slate-400">Clauvens EXAUS</p>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-orange-950/40 border border-orange-900/50 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xs">NC</div>
                    <div>
                        <h4 class="font-bold text-sm text-white">Natcash (Natcom)</h4>
                        <p class="text-xs text-orange-300 font-mono font-bold mt-0.5">35-37-1184</p>
                        <p class="text-[11px] text-slate-400">Clauvens EXAUS</p>
                    </div>
                </div>
            </div>

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

            <form action="don.php" method="POST" enctype="multipart/form-data" class="space-y-4">
                <input type="hidden" name="artiste_id" value="<?= htmlspecialchars($selectedArtistId) ?>">
                <input type="hidden" name="musique_id" value="<?= htmlspecialchars($selectedMusiqueId) ?>">

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Atis Wap Sipòte A</label>
                        <input type="text" name="nom_artiste" value="<?= htmlspecialchars($artistObj['nom_scene'] ?? ($musiqueObj['nom_artiste'] ?? 'Atis UpMizik')) ?>" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Mizik Ki Motive W (Opsyonèl)</label>
                        <input type="text" name="titre_musique" value="<?= htmlspecialchars($musiqueObj['titre'] ?? 'Donasyon Dirèk') ?>" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Montan Wap Voye *</label>
                        <div class="flex gap-2">
                            <input type="number" step="0.5" min="1" name="montant" value="5.00" required class="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono font-bold focus:outline-none focus:border-red-500">
                            <select name="devise" class="px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white">
                                <option value="USD">USD ($)</option>
                                <option value="HTG">HTG (G)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Metòd Peman Ou Te Sèvi A</label>
                        <select name="methode" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white">
                            <option value="MonCash">MonCash (Digicel)</option>
                            <option value="Natcash">Natcash (Natcom)</option>
                            <option value="Zelle">Zelle / Kat labank</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Non W / Pseudonyme *</label>
                        <input type="text" name="nom_donateur" required placeholder="egz: Jean Claude Fanatik" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Nimewo Telefòn Ou *</label>
                        <input type="tel" name="telephone_donateur" required placeholder="+509 3800-0000" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <label class="block text-xs font-bold uppercase tracking-wider text-amber-400">
                        <i class="fa-solid fa-camera mr-1"></i> Foto / Screenshot Prèv Transfè A *
                    </label>
                    <input type="file" name="preuve_file" required accept="image/*,.pdf" class="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer">
                    <p class="text-[11px] text-slate-500">Prèv la ap anrejistre nan dosye /uploads/preuves/ sou Hostinger ou.</p>
                </div>

                <button type="submit" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition">
                    <i class="fa-solid fa-paper-plane mr-2"></i> Soumèt Donasyon & Prèv La
                </button>
            </form>
        </div>
    </main>
</body>
</html>
