<?php
/**
 * UpMizik - Paj Koneksyon (Atis & Admin)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

$error = '';
$message = '';
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $pin = trim($_POST['pin'] ?? '');

    if (empty($email) || empty($pin)) {
        $error = 'Tanpri antre imèl ou ak kòd PIN / modpas ou.';
    } else {
        // Tcheke si se yon admin
        if ($email === 'upmizik.haiti@gmail.com' && ($pin === '3891' || $pin === 'admin123' || $pin === '0000')) {
            $_SESSION['is_admin'] = true;
            $_SESSION['admin_email'] = $email;
            header('Location: admin.php');
            exit;
        }

        // Otantifikasyon Atis avèk auth.php ak password_verify()
        $authResult = authenticateArtist($email, $pin, $db);
        if ($authResult['success']) {
            $artist = $authResult['artist'];
            header('Location: artistes.php?id=' . urlencode($artist['id']));
            exit;
        } else {
            $error = $authResult['message'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ht" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Koneksyon - UpMizik</title>
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
<body class="bg-[#05070a] text-slate-100 min-h-screen flex flex-col items-center justify-center p-4 antialiased selection:bg-red-600 selection:text-white">

    <div class="max-w-md w-full">
        <div class="text-center mb-8">
            <a href="index.php" class="inline-flex items-center gap-2.5 mb-3">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <i class="fa-solid fa-play text-white text-lg"></i>
                </div>
                <span class="font-display text-3xl font-extrabold text-white">Up<span class="text-red-500">Mizik</span></span>
            </a>
            <p class="text-xs text-slate-400">Konekte nan espas atis ou oswa pano administrasyon an</p>
        </div>

        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <?php if (!empty($error)): ?>
                <div class="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span><?= htmlspecialchars($error) ?></span>
                </div>
            <?php endif; ?>

            <form action="connexion.php" method="POST" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Imèl Ou</label>
                    <input type="email" name="email" required placeholder="artis@example.com" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-red-500">
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Kòd PIN / Modpas</label>
                        <span class="text-[11px] text-slate-500">PIN 4 chif</span>
                    </div>
                    <input type="password" name="pin" required placeholder="••••" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-red-500">
                </div>

                <button type="submit" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition">
                    <i class="fa-solid fa-right-to-bracket mr-2"></i> Konekte
                </button>
            </form>

            <div class="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
                Ou poko gen yon kont atis? <a href="inscription.php" class="text-red-400 hover:underline font-bold">Enskri kounye a</a>
            </div>
        </div>
    </div>
</body>
</html>
