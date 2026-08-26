<?php
/**
 * UpMizik - Pibliye Mizik (PHP / MySQL / Hostinger File Storage)
 */
require_once __DIR__ . '/config.php';

$message = '';
$error = '';

$db = getDB();
$artistList = [];
if ($db) {
    try {
        $artistList = $db->query("SELECT id, nom_scene, nom_complet FROM artistes WHERE statut = 'actif' ORDER BY nom_scene ASC")->fetchAll();
    } catch (Exception $e) {}
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $titre = trim($_POST['titre'] ?? '');
    $nomArtiste = trim($_POST['nom_artiste'] ?? '');
    $artisteId = trim($_POST['artiste_id'] ?? '');
    $featuring = trim($_POST['featuring'] ?? '');
    $categorie = trim($_POST['categorie'] ?? 'Rap Kreyol');
    $format = trim($_POST['format'] ?? 'single');

    if (empty($titre) || empty($nomArtiste)) {
        $error = 'Tanpri antre tit mizik la ak non atis la.';
    } elseif (!isset($_FILES['audio_file']) || $_FILES['audio_file']['error'] !== UPLOAD_ERR_OK) {
        $error = 'Tanpri chwazi yon fichye odyo valid (MP3 oswa WAV).';
    } else {
        // Telechaje fichye odyo a avèk validasyon finfo_file ak move_uploaded_file nan /var/www/html/upmizik/uploads/
        $audioUpload = handleAudioUpload($_FILES['audio_file']);

        if (!$audioUpload['success']) {
            $error = $audioUpload['message'];
        } else {
            $audioUrl = $audioUpload['audioUrl'];
            $coverUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';

            // Telechaje foto kouvèti a si li bay li
            if (isset($_FILES['cover_file']) && $_FILES['cover_file']['error'] === UPLOAD_ERR_OK) {
                $coverUpload = uploadServerFile($_FILES['cover_file'], 'covers');
                if ($coverUpload['success']) {
                    $coverUrl = $coverUpload['url'];
                }
            }

            if ($db) {
                try {
                    $musicId = 'mus_' . time() . '_' . bin2hex(random_bytes(3));
                    if (empty($artisteId)) {
                        // Kreye atis la si li pa la oswa pran premye a
                        $artStmt = $db->prepare("SELECT id FROM artistes WHERE nom_scene = ? LIMIT 1");
                        $artStmt->execute([$nomArtiste]);
                        $found = $artStmt->fetch();
                        if ($found) {
                            $artisteId = $found['id'];
                        } else {
                            $artisteId = 'art_' . time() . '_' . bin2hex(random_bytes(2));
                            $db->prepare("INSERT INTO artistes (id, nom_scene, nom_complet, email, telephone, statut) VALUES (?, ?, ?, ?, ?, 'actif')")
                               ->execute([$artisteId, $nomArtiste, $nomArtiste, 'artist_'.time().'@upmizik.local', '+50900000000']);
                        }
                    }

                    $audioCol = getMusiquesAudioColumn($db);
                    $insertStmt = $db->prepare("
                        INSERT INTO musiques (id, titre, artiste_id, nom_artiste, featuring, categorie, format, cover_url, `{$audioCol}`, statut)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif')
                    ");
                    $insertStmt->execute([
                        $musicId, $titre, $artisteId, $nomArtiste, $featuring, $categorie, $format, $coverUrl, $audioUrl
                    ]);

                    $message = 'Mizik la valide (finfo_file), estoke nan /var/www/html/upmizik/uploads/ epi sove nan kolòn ' . $audioCol . ' nan MySQL!';
                } catch (Exception $e) {
                    $error = 'Erè pandan anrejistreman nan baz done a: ' . $e->getMessage();
                }
            } else {
                $message = 'Fichye mizik la anrejistre avèk siksè nan /var/www/html/upmizik/uploads/! (Konfigire MySQL nan config.php pou anrejistreman konplè).';
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
    <title>Pibliye Mizik - UpMizik Hostinger</title>
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
            <a href="don.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">Donasyon</a>
        </nav>
    </header>

    <main class="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div class="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xl">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div>
                    <h1 class="font-display text-2xl font-bold text-white">Telechaje Mizik Ou</h1>
                    <p class="text-xs text-slate-400">Fichye yo ap anrejistre dirèkteman nan dosye sèvè Hostinger a (/uploads/)</p>
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

            <form action="pibliye.php" method="POST" enctype="multipart/form-data" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Tit Mizik La *</label>
                    <input type="text" name="titre" required placeholder="egz: Gouyad Lanmou" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Non Atis La *</label>
                        <input type="text" name="nom_artiste" required placeholder="egz: Baky Popilè" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Featuring (Opsyonèl)</label>
                        <input type="text" name="featuring" placeholder="egz: Kenny Haiti" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Kategori / Jan Mizikal</label>
                        <select name="categorie" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500 transition">
                            <option value="Rap Kreyol">Rap Kreyòl</option>
                            <option value="Konpa">Konpa</option>
                            <option value="Afrobeats">Afrobeats</option>
                            <option value="Trap Kreyol">Trap Kreyòl</option>
                            <option value="Leve Jwenn">Leve Jwenn</option>
                            <option value="Gospel">Gospel / Levanjil</option>
                            <option value="Tradisionèl">Tradisionèl / Rasin</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Fòma</label>
                        <select name="format" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500 transition">
                            <option value="single">Single</option>
                            <option value="album">Albòm</option>
                            <option value="ep">EP</option>
                            <option value="mixtape">Mixtape</option>
                        </select>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                    <label class="block text-xs font-bold uppercase tracking-wider text-red-400">
                        <i class="fa-solid fa-music mr-1"></i> Fichye Odyo Mizik La (MP3 / WAV) *
                    </label>
                    <input type="file" name="audio_file" required accept="audio/*,.mp3,.wav,.aac,.m4a" class="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer">
                    <p class="text-[11px] text-slate-500">Fichye a pral anrejistre dirèkteman nan dosye /uploads/musiques/ sou Hostinger ou.</p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        <i class="fa-solid fa-image mr-1"></i> Foto Kouvèti (Cover Art - JPG, PNG)
                    </label>
                    <input type="file" name="cover_file" accept="image/*" class="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer">
                    <p class="text-[11px] text-slate-500">Pral anrejistre nan /uploads/covers/</p>
                </div>

                <button type="submit" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition">
                    <i class="fa-solid fa-upload mr-2"></i> Pibliye Mizik La Sou UpMizik
                </button>
            </form>
        </div>
    </main>
</body>
</html>
