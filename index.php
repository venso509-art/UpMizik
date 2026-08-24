<?php
/**
 * UpMizik - Paj Akèy & Lekti Mizik (PHP / MySQL / Hostinger)
 */
require_once __DIR__ . '/config.php';

$db = getDB();
$musiques = [];
$topMusiques = [];
$artistes = [];

if ($db) {
    try {
        // Rekipere tout mizik aktif yo
        $stmt = $db->query("SELECT m.*, a.avatar_url as avatar_artiste, a.nom_scene FROM musiques m LEFT JOIN artistes a ON m.artiste_id = a.id WHERE m.statut = 'actif' ORDER BY m.ecoutes DESC, m.date_creation DESC");
        $musiques = $stmt->fetchAll();
        $topMusiques = array_slice($musiques, 0, 3);

        // Rekipere atis aktif yo
        $artStmt = $db->query("SELECT * FROM artistes WHERE statut = 'actif' ORDER BY total_ecoutes DESC LIMIT 8");
        $artistes = $artStmt->fetchAll();
    } catch (Exception $e) {
        // Silans si baz done a poko inisyalize
    }
}

// Done egzanp si baz done a poko gen done
if (empty($musiques)) {
    $musiques = [
        [
            'id' => 'mus_1',
            'titre' => 'Gouyad Lanmou',
            'nom_artiste' => 'Baky Popilè',
            'featuring' => 'Kenny Haiti',
            'categorie' => 'Rap Kreyol',
            'cover_url' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
            'audio_url' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            'ecoutes' => 4820,
            'total_dons' => 120.00
        ],
        [
            'id' => 'mus_2',
            'titre' => 'Ayiti Pap Peri',
            'nom_artiste' => 'Rutshelle Guillaume',
            'featuring' => '',
            'categorie' => 'Afrobeats',
            'cover_url' => 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
            'audio_url' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            'ecoutes' => 3210,
            'total_dons' => 85.00
        ],
        [
            'id' => 'mus_3',
            'titre' => 'Konpa Chalè',
            'nom_artiste' => 'K-Dilak Mesaje a',
            'featuring' => 'Bedjine',
            'categorie' => 'Konpa',
            'cover_url' => 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            'audio_url' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            'ecoutes' => 2950,
            'total_dons' => 60.00
        ]
    ];
    $topMusiques = $musiques;
}
?>
<!DOCTYPE html>
<html lang="ht" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UpMizik - Platfòm Mizik Ayisyen & Sipò Dirèk Pou Atis</title>
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
<body class="bg-[#05070a] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-red-600 selection:text-white pb-28">

    <!-- HEADER / NAVIGATION -->
    <header class="sticky top-0 z-40 bg-[#080d14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <a href="index.php" class="flex items-center gap-2.5 group">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform">
                    <i class="fa-solid fa-play text-white text-base"></i>
                </div>
                <div class="flex flex-col">
                    <span class="font-display text-2xl font-extrabold tracking-tight text-white flex items-center gap-1">
                        Up<span class="text-red-500">Mizik</span>
                    </span>
                    <span class="text-[10px] text-slate-400 -mt-1 font-medium tracking-wider uppercase">Platfòm Atis Ayisyen</span>
                </div>
            </a>
        </div>

        <nav class="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-slate-800">
            <a href="index.php" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white shadow">Akèy</a>
            <a href="artistes.php" class="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition">Atis</a>
            <a href="pibliye.php" class="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition">Pibliye Mizik</a>
            <a href="don.php" class="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition">Sipòte / Don</a>
        </nav>

        <div class="flex items-center gap-2.5">
            <?php if (!empty($_SESSION['artist_id'])): ?>
                <a href="artistes.php?id=<?= urlencode($_SESSION['artist_id']) ?>" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700">
                    <i class="fa-solid fa-user-check text-green-400"></i>
                    <span>Pwofil Mwen</span>
                </a>
            <?php else: ?>
                <a href="connexion.php" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition">
                    Koneksyon
                </a>
                <a href="inscription.php" class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-xs font-bold text-white shadow-md shadow-red-600/30 transition">
                    Enskri Atis ($4.99)
                </a>
            <?php endif; ?>
        </div>
    </header>

    <!-- BANNER HERO -->
    <section class="relative px-4 lg:px-8 pt-6 pb-4 max-w-7xl mx-auto w-full">
        <div class="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/80 via-slate-900 to-[#0c131d] border border-red-900/30 p-6 md:p-10 shadow-2xl">
            <div class="absolute -right-20 -top-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="relative z-10 max-w-2xl">
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
                    <i class="fa-solid fa-bolt"></i> 100% Pou Kilti Ayisyen an
                </span>
                <h1 class="font-display text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3">
                    Koute Mizik Kreyòl & Sipòte Atis Yo <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">Dirèkteman</span>
                </h1>
                <p class="text-sm md:text-base text-slate-300 mb-6 leading-relaxed">
                    UpMizik pèmèt atis Ayisyen telechaje mizik yo epi resevwa 85% donasyon fanatik yo voye via MonCash & Natcash san entèmedyè.
                </p>
                <div class="flex flex-wrap items-center gap-3">
                    <a href="pibliye.php" class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-red-600/30 transition">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Upload Mizik Ou
                    </a>
                    <a href="don.php" class="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-sm font-semibold text-white border border-slate-700 flex items-center gap-2 transition">
                        <i class="fa-solid fa-hand-holding-dollar text-amber-400"></i> Fè Yon Donasyon
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- TOP 3 PODIUM / TANDANS -->
    <section class="px-4 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <div class="w-2.5 h-6 bg-red-600 rounded-full"></div>
                <h2 class="font-display text-xl md:text-2xl font-bold text-white">Top 3 Mizik Ki Plis Ap Koute</h2>
            </div>
            <span class="text-xs text-slate-400 font-medium">Klasman Ofisyèl</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <?php foreach ($topMusiques as $idx => $m): ?>
                <div class="bg-slate-900/60 hover:bg-slate-800/60 transition border border-slate-800 rounded-2xl p-4 flex items-center gap-4 relative group">
                    <span class="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs shadow-lg <?= $idx === 0 ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20' : ($idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white') ?>">
                        #<?= $idx + 1 ?>
                    </span>
                    <img src="<?= htmlspecialchars($m['cover_url']) ?>" alt="<?= htmlspecialchars($m['titre']) ?>" class="w-16 h-16 rounded-xl object-cover shadow border border-slate-800 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-sm text-white truncate group-hover:text-red-400 transition"><?= htmlspecialchars($m['titre']) ?></h3>
                        <p class="text-xs text-slate-400 truncate"><?= htmlspecialchars($m['nom_artiste']) ?><?= !empty($m['featuring']) ? ' ft. ' . htmlspecialchars($m['featuring']) : '' ?></p>
                        <div class="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                            <span><i class="fa-solid fa-headphones text-red-500 mr-1"></i> <?= number_format($m['ecoutes'] ?? 0) ?></span>
                            <span><i class="fa-solid fa-dollar-sign text-green-400 mr-0.5"></i> <?= number_format($m['total_dons'] ?? 0, 2) ?></span>
                        </div>
                    </div>
                    <button onclick="playTrack('<?= htmlspecialchars($m['audio_url']) ?>', '<?= htmlspecialchars(addslashes($m['titre'])) ?>', '<?= htmlspecialchars(addslashes($m['nom_artiste'])) ?>', '<?= htmlspecialchars($m['cover_url']) ?>')" class="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 flex-shrink-0 transition">
                        <i class="fa-solid fa-play text-sm ml-0.5"></i>
                    </button>
                </div>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- TOUT MIZIK YO (LISTE COMPLETE) -->
    <section class="px-4 lg:px-8 py-6 max-w-7xl mx-auto w-full flex-1">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <div class="w-2.5 h-6 bg-red-600 rounded-full"></div>
                <h2 class="font-display text-xl md:text-2xl font-bold text-white">Tout Mizik Disponib Yo</h2>
            </div>
            <span class="text-xs text-slate-400 font-medium"><?= count($musiques) ?> mizik an total</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <?php foreach ($musiques as $m): ?>
                <div class="bg-slate-900/50 hover:bg-slate-900 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col group transition">
                    <div class="relative rounded-xl overflow-hidden mb-3 aspect-square bg-slate-950">
                        <img src="<?= htmlspecialchars($m['cover_url']) ?>" alt="<?= htmlspecialchars($m['titre']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                        <button onclick="playTrack('<?= htmlspecialchars($m['audio_url']) ?>', '<?= htmlspecialchars(addslashes($m['titre'])) ?>', '<?= htmlspecialchars(addslashes($m['nom_artiste'])) ?>', '<?= htmlspecialchars($m['cover_url']) ?>')" class="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition transform scale-90 group-hover:scale-100">
                            <i class="fa-solid fa-play text-base ml-0.5"></i>
                        </button>
                        <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-slate-300">
                            <?= htmlspecialchars($m['categorie'] ?? 'Tout') ?>
                        </span>
                    </div>
                    <h3 class="font-bold text-sm text-white truncate group-hover:text-red-400 transition"><?= htmlspecialchars($m['titre']) ?></h3>
                    <p class="text-xs text-slate-400 truncate mb-3"><?= htmlspecialchars($m['nom_artiste']) ?></p>
                    
                    <div class="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span class="text-slate-400 text-[11px]"><i class="fa-solid fa-headphones text-slate-500 mr-1"></i> <?= number_format($m['ecoutes'] ?? 0) ?></span>
                        <a href="don.php?musique_id=<?= urlencode($m['id']) ?>" class="px-2.5 py-1 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-[11px] font-bold border border-red-500/20 transition">
                            <i class="fa-solid fa-heart mr-1"></i> Sipòte
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- LECTEUR AUDIO FLOTTANT (BOTTOM STICKY AUDIO PLAYER) -->
    <div id="audio-player-bar" class="fixed bottom-0 left-0 right-0 z-50 bg-[#070b10]/95 backdrop-blur-xl border-t border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-2xl">
        <div class="flex items-center gap-3 min-w-[200px] max-w-xs">
            <img id="player-cover" src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80" alt="Cover" class="w-12 h-12 rounded-xl object-cover border border-slate-800 flex-shrink-0">
            <div class="min-w-0">
                <h4 id="player-title" class="font-bold text-xs text-white truncate">Chwazi yon mizik</h4>
                <p id="player-artist" class="text-[11px] text-slate-400 truncate">UpMizik Player</p>
            </div>
        </div>

        <div class="flex-1 max-w-xl flex flex-col items-center gap-1.5">
            <div class="flex items-center gap-4">
                <button id="btn-prev" class="text-slate-400 hover:text-white transition text-sm"><i class="fa-solid fa-backward-step"></i></button>
                <button id="btn-play-pause" onclick="togglePlayPause()" class="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition">
                    <i id="play-icon" class="fa-solid fa-play ml-0.5 text-sm"></i>
                </button>
                <button id="btn-next" class="text-slate-400 hover:text-white transition text-sm"><i class="fa-solid fa-forward-step"></i></button>
            </div>
            <div class="w-full flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span id="current-time">0:00</span>
                <input id="seek-bar" type="range" min="0" max="100" value="0" class="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600">
                <span id="total-duration">0:00</span>
            </div>
        </div>

        <div class="hidden sm:flex items-center gap-2 min-w-[120px] justify-end">
            <i class="fa-solid fa-volume-high text-slate-400 text-xs"></i>
            <input id="volume-bar" type="range" min="0" max="1" step="0.05" value="0.9" class="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600">
        </div>
    </div>

    <audio id="global-audio"></audio>

    <script>
        const audio = document.getElementById('global-audio');
        const playIcon = document.getElementById('play-icon');
        const playerTitle = document.getElementById('player-title');
        const playerArtist = document.getElementById('player-artist');
        const playerCover = document.getElementById('player-cover');
        const seekBar = document.getElementById('seek-bar');
        const currentTimeEl = document.getElementById('current-time');
        const totalDurationEl = document.getElementById('total-duration');
        const volumeBar = document.getElementById('volume-bar');

        function playTrack(url, title, artist, cover) {
            audio.src = url;
            playerTitle.textContent = title;
            playerArtist.textContent = artist;
            if (cover) playerCover.src = cover;
            audio.play().then(() => {
                playIcon.classList.replace('fa-play', 'fa-pause');
            }).catch(e => console.log('Audio autoplay blocked', e));
        }

        function togglePlayPause() {
            if (!audio.src) return;
            if (audio.paused) {
                audio.play();
                playIcon.classList.replace('fa-play', 'fa-pause');
            } else {
                audio.pause();
                playIcon.classList.replace('fa-pause', 'fa-play');
            }
        }

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                seekBar.value = (audio.currentTime / audio.duration) * 100;
                currentTimeEl.textContent = formatTime(audio.currentTime);
                totalDurationEl.textContent = formatTime(audio.duration);
            }
        });

        seekBar.addEventListener('input', () => {
            if (audio.duration) {
                audio.currentTime = (seekBar.value / 100) * audio.duration;
            }
        });

        if (volumeBar) {
            volumeBar.addEventListener('input', () => {
                audio.volume = volumeBar.value;
            });
        }

        function formatTime(secs) {
            const m = Math.floor(secs / 60) || 0;
            const s = Math.floor(secs % 60) || 0;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    </script>
</body>
</html>
