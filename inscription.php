<?php
/**
 * UpMizik - Enskripsyon Atis ak Prèv $4.99 (PHP / MySQL / Hostinger)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

$message = '';
$error = '';
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nomScene = trim($_POST['nom_scene'] ?? '');
    $nomComplet = trim($_POST['nom_complet'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telephone = trim($_POST['telephone'] ?? '');
    $ville = trim($_POST['ville'] ?? 'Pòtoprens');
    $pin = trim($_POST['pin'] ?? '0000');
    $bio = trim($_POST['bio'] ?? '');

    if (empty($nomScene) || empty($nomComplet) || empty($email) || empty($telephone)) {
        $error = 'Tanpri ranpli tout chan obligatwa yo.';
    } elseif (strlen($pin) < 4) {
        $error = 'Kòd PIN nan dwe gen omwen 4 chif pou w ka konekte pita.';
    } elseif (!isset($_FILES['preuve_inscription']) || $_FILES['preuve_inscription']['error'] !== UPLOAD_ERR_OK) {
        $error = 'Tanpri telechaje foto prèv peman frè $4.99 la.';
    } else {
        // Telechaje prèv la
        $uploadPreuve = uploadServerFile($_FILES['preuve_inscription'], 'preuves');

        if (!$uploadPreuve['success']) {
            $error = $uploadPreuve['message'];
        } else {
            $preuveUrl = $uploadPreuve['url'];
            $avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

            // Telechaje avatar si li bay li
            if (isset($_FILES['avatar_file']) && $_FILES['avatar_file']['error'] === UPLOAD_ERR_OK) {
                $upAv = uploadServerFile($_FILES['avatar_file'], 'avatars');
                if ($upAv['success']) $avatarUrl = $upAv['url'];
            }

            $artisteId = 'art_' . time() . '_' . bin2hex(random_bytes(3));

            if ($db) {
                try {
                    // Tcheke si email la deja egziste
                    $check = $db->prepare("SELECT id FROM artistes WHERE email = ?");
                    $check->execute([$email]);
                    if ($check->fetch()) {
                        $error = 'Imèl sa a deja anrejistre pou yon atis. Tanpri konekte.';
                    } else {
                        $hashedPin = hashArtistPin($pin);
                        $stmt = $db->prepare("
                            INSERT INTO artistes (id, nom_scene, nom_complet, email, telephone, ville, pin, avatar_url, bio, statut, preuve_inscription_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)
                        ");
                        $stmt->execute([
                            $artisteId, $nomScene, $nomComplet, $email, $telephone, $ville, $hashedPin, $avatarUrl, $bio, $preuveUrl
                        ]);

                        $message = 'Demann enskripsyon w lan voye avèk siksè! Pwofil ou an atant validasyon pa ekip UpMizik la. PIN koneksyon w se: ' . htmlspecialchars($pin);
                    }
                } catch (Exception $e) {
                    $error = 'Erè baz done: ' . $e->getMessage();
                }
            } else {
                $message = 'Fichye prèv ou anrejistre sou sèvè a nan /uploads/preuves/! (Konfigire MySQL nan config.php pou anrejistreman konplè).';
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
    <title>Enskripsyon Atis - UpMizik</title>
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
        <a href="connexion.php" class="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800">
            Konekte Atis
        </a>
    </header>

    <main class="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div class="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xl">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <div>
                    <h1 class="font-display text-2xl font-bold text-white">Enskripsyon Kòm Atis Ofisyèl</h1>
                    <p class="text-xs text-slate-400">Frè enskripsyon: $4.99 USD (~725 HTG) pou lavi ak 85% donasyon dirèk.</p>
                </div>
            </div>

            <!-- ENFÒMASYON PEMAN MONCASH / NATCASH POU ENSRIPSYON -->
            <div class="p-4 mb-6 rounded-2xl bg-slate-950/80 border border-slate-800">
                <h4 class="font-bold text-xs uppercase tracking-wider text-amber-400 mb-2">
                    <i class="fa-solid fa-wallet mr-1"></i> Nimewo Pou Fè Peman Frè $4.99 La :
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="p-2.5 rounded-xl bg-red-950/40 border border-red-900/40">
                        <span class="text-red-400 font-bold">MonCash:</span> <span class="font-mono text-white font-bold">38-91-2317</span> (Clauvens EXAUS)
                    </div>
                    <div class="p-2.5 rounded-xl bg-orange-950/40 border border-orange-900/40">
                        <span class="text-orange-400 font-bold">Natcash:</span> <span class="font-mono text-white font-bold">35-37-1184</span> (Clauvens EXAUS)
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

            <form action="inscription.php" method="POST" enctype="multipart/form-data" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Non Sèn (Nom d'artiste) *</label>
                        <input type="text" name="nom_scene" required placeholder="egz: Baky Popilè" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Non Konplè (Non & Prenon) *</label>
                        <input type="text" name="nom_complet" required placeholder="egz: Jean Clauvens" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Imèl *</label>
                        <input type="email" name="email" required placeholder="artis@example.com" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Telefòn MonCash / Natcash *</label>
                        <input type="tel" name="telephone" required placeholder="+509 3800-0000" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Vil / Komin</label>
                        <input type="text" name="ville" value="Pòtoprens" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Kòd PIN Sekirite (4 Chif) *</label>
                        <input type="password" maxlength="6" name="pin" required placeholder="1234" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-red-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Biyografi Kout</label>
                    <textarea name="bio" rows="3" placeholder="Pale nou de karyè mizikal ou, stil ou..." class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500"></textarea>
                </div>

                <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <label class="block text-xs font-bold uppercase tracking-wider text-amber-400">
                        <i class="fa-solid fa-receipt mr-1"></i> Foto Prèv Peman $4.99 La (Screenshot MonCash / Natcash) *
                    </label>
                    <input type="file" name="preuve_inscription" required accept="image/*,.pdf" class="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer">
                    <p class="text-[11px] text-slate-500">Prèv la ap anrejistre nan /uploads/preuves/ sou Hostinger ou.</p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        <i class="fa-solid fa-user-tie mr-1"></i> Foto Pwofil Atis (Avatar)
                    </label>
                    <input type="file" name="avatar_file" accept="image/*" class="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer">
                </div>

                <button type="submit" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition">
                    <i class="fa-solid fa-check mr-2"></i> Soumèt Enskripsyon Atis La
                </button>
            </form>
        </div>
    </main>
</body>
</html>
