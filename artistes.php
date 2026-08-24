<?php
/**
 * UpMizik - Lis Atis & Pwofil Atis (PHP / MySQL / Hostinger)
 */
require_once __DIR__ . '/config.php';

$db = getDB();
$artistId = $_GET['id'] ?? '';
$singleArtist = null;
$artistMusic = [];
$allArtists = [];

if ($db) {
    try {
        if (!empty($artistId)) {
            $stmt = $db->prepare("SELECT * FROM artistes WHERE id = ?");
            $stmt->execute([$artistId]);
            $singleArtist = $stmt->fetch();

            if ($singleArtist) {
                $mStmt = $db->prepare("SELECT * FROM musiques WHERE artiste_id = ? AND statut = 'actif' ORDER BY ecoutes DESC");
                $mStmt->execute([$artistId]);
                $artistMusic = $mStmt->fetchAll();
            }
        } else {
            $stmt = $db->query("SELECT a.*, COUNT(m.id) as total_mizik FROM artistes a LEFT JOIN musiques m ON a.id = m.artiste_id WHERE a.statut = 'actif' GROUP BY a.id ORDER BY a.total_ecoutes DESC");
            $allArtists = $stmt->fetchAll();
        }
    } catch (Exception $e) {}
}

if (empty($allArtists) && empty($singleArtist)) {
    // Done demonstrasyon
    $allArtists = [
        [
            'id' => 'art_1',
            'nom_scene' => 'Baky Popilè',
            'nom_complet' => 'Baptiste Kensley',
            'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            'ville' => 'Les Cayes',
            'bio' => 'Rappeur Ayisyen ki gen anpil siksè ak gwo kolaborasyon.',
            'total_ecoutes' => 24500,
            'total_mizik' => 12
        ],
        [
            'id' => 'art_2',
            'nom_scene' => 'Rutshelle Guillaume',
            'nom_complet' => 'Rutshelle Guillaume',
            'avatar_url' => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
            'ville' => 'Pòtoprens',
            'bio' => 'Rèn mizik kreyòl, vwa dore konpa ak afrobeats.',
            'total_ecoutes' => 38900,
            'total_mizik' => 8
        ]
    ];
}
?>
<!DOCTYPE html>
<html lang="ht" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $singleArtist ? htmlspecialchars($singleArtist['nom_scene']) . ' - UpMizik' : 'Atis Yo - UpMizik' ?></title>
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
    <header class="sticky top-0 z-40 bg-[#080d14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <a href="index.php" class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <i class="fa-solid fa-play text-white text-base"></i>
            </div>
            <span class="font-display text-2xl font-extrabold text-white">Up<span class="text-red-500">Mizik</span></span>
        </a>
        <nav class="flex items-center gap-2">
            <a href="index.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Akèy</a>
            <a href="pibliye.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Pibliye Mizik</a>
            <a href="don.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Sipòte / Don</a>
        </nav>
    </header>

    <main class="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <?php if ($singleArtist): ?>
            <!-- PWOFIL YON ATIS -->
            <div class="bg-gradient-to-r from-red-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div class="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <img src="<?= htmlspecialchars($singleArtist['avatar_url'] ?: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80') ?>" alt="<?= htmlspecialchars($singleArtist['nom_scene']) ?>" class="w-32 h-32 rounded-2xl object-cover border-2 border-red-500/30 shadow-2xl">
                    <div class="flex-1 text-center sm:text-left">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold mb-2">
                            <i class="fa-solid fa-circle-check"></i> Atis Ofisyèl UpMizik
                        </div>
                        <h1 class="font-display text-3xl sm:text-4xl font-extrabold text-white mb-1"><?= htmlspecialchars($singleArtist['nom_scene']) ?></h1>
                        <p class="text-xs text-slate-400 mb-3"><i class="fa-solid fa-location-dot mr-1 text-red-500"></i> <?= htmlspecialchars($singleArtist['ville']) ?> • <?= htmlspecialchars($singleArtist['nom_complet']) ?></p>
                        <p class="text-sm text-slate-300 max-w-2xl leading-relaxed"><?= nl2br(htmlspecialchars($singleArtist['bio'] ?: 'Atis sou platfòm UpMizik.')) ?></p>
                    </div>
                    <div class="flex flex-col gap-2.5 w-full sm:w-auto">
                        <a href="don.php?artiste_id=<?= urlencode($singleArtist['id']) ?>" class="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white text-center shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Sipòte Atis Sa A
                        </a>
                        <a href="pibliye.php" class="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 text-center border border-slate-700 transition">
                            <i class="fa-solid fa-plus mr-1"></i> Ajoute Mizik
                        </a>
                    </div>
                </div>
            </div>

            <!-- MIZIK ATIS SA A -->
            <div class="mb-8">
                <h2 class="font-display text-xl font-bold text-white mb-4">Mizik <?= htmlspecialchars($singleArtist['nom_scene']) ?> Yo</h2>
                <?php if (empty($artistMusic)): ?>
                    <p class="text-sm text-slate-500">Atis sa a poko gen mizik ki aktif sou platfòm lan.</p>
                <?php else: ?>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <?php foreach ($artistMusic as $m): ?>
                            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                <img src="<?= htmlspecialchars($m['cover_url']) ?>" alt="<?= htmlspecialchars($m['titre']) ?>" class="w-14 h-14 rounded-xl object-cover">
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-bold text-sm text-white truncate"><?= htmlspecialchars($m['titre']) ?></h4>
                                    <span class="text-[11px] text-slate-400"><i class="fa-solid fa-headphones text-red-500 mr-1"></i> <?= number_format($m['ecoutes']) ?></span>
                                </div>
                                <a href="don.php?musique_id=<?= urlencode($m['id']) ?>" class="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold transition">
                                    Sipòte
                                </a>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

        <?php else: ?>
            <!-- LIS TOUT ATIS YO -->
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="font-display text-2xl md:text-3xl font-extrabold text-white">Tout Atis UpMizik Yo</h1>
                    <p class="text-xs text-slate-400">Dekouvri epi sipòte jèn talan kreyòl yo</p>
                </div>
                <a href="inscription.php" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition">
                    Vin Yon Atis
                </a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <?php foreach ($allArtists as $art): ?>
                    <a href="artistes.php?id=<?= urlencode($art['id']) ?>" class="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center group transition">
                        <img src="<?= htmlspecialchars($art['avatar_url'] ?: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80') ?>" alt="<?= htmlspecialchars($art['nom_scene']) ?>" class="w-24 h-24 rounded-full object-cover border-2 border-slate-700 group-hover:border-red-500 transition mb-3 shadow-lg">
                        <h3 class="font-bold text-base text-white group-hover:text-red-400 transition"><?= htmlspecialchars($art['nom_scene']) ?></h3>
                        <p class="text-xs text-slate-400 mb-2"><?= htmlspecialchars($art['ville'] ?? 'Ayiti') ?></p>
                        <span class="px-3 py-1 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300 group-hover:bg-red-600 group-hover:text-white transition">
                            Gade Pwofil
                        </span>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </main>
</body>
</html>
