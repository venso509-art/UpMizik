<?php
/**
 * UpMizik - Global Configuration & Database Handler (Hostinger / MySQL)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ----------------------------------------------------------
// KONFIGIRASYON BAZ DONE MYSQL SOU HOSTINGER
// ----------------------------------------------------------
// Ranplase enfòmasyon sa yo ak sa ou kreye nan Hostinger hPanel > Databases
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_upmizik');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_upmizik_user');
define('DB_PASS', getenv('DB_PASS') ?: 'VotreMotDePasseSekirize509@');

// URL Sit la sou Hostinger (egz: https://upmizik.com)
define('SITE_URL', getenv('SITE_URL') ?: ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . ($_SERVER['HTTP_HOST'] ?? 'localhost')));
define('SITE_NAME', 'UpMizik');

// Dosye pou estoke fichye yo sou sèvè a
define('UPLOAD_DIR', __DIR__ . '/uploads');
define('UPLOAD_URL', SITE_URL . '/uploads');

// Asire tout sou-dosye yo egziste
$requiredFolders = ['musiques', 'covers', 'preuves', 'avatars', 'bannieres'];
foreach ($requiredFolders as $f) {
    $dir = UPLOAD_DIR . '/' . $f;
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
}

/**
 * Koneksyon PDO ak MySQL
 */
function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]);
        return $pdo;
    } catch (PDOException $e) {
        // Retounen null si baz done a poko konfigire sou Hostinger
        return null;
    }
}

/**
 * Fonksyon pou sove fichye ki telechaje sou sèvè Hostinger
 */
function uploadServerFile($file, $subfolder = 'musiques') {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Erè pandan telechajman fichye a.'];
    }

    $allowedFolders = ['musiques', 'covers', 'preuves', 'avatars', 'bannieres'];
    if (!in_array($subfolder, $allowedFolders)) {
        $subfolder = 'musiques';
    }

    $targetDir = UPLOAD_DIR . '/' . $subfolder;
    if (!file_exists($targetDir)) {
        @mkdir($targetDir, 0755, true);
    }

    $originalName = $file['name'];
    $tmpName = $file['tmp_name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    $allowedExt = [
        'musiques' => ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'],
        'covers'   => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        'preuves'  => ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        'avatars'  => ['jpg', 'jpeg', 'png', 'webp'],
        'bannieres'=> ['jpg', 'jpeg', 'png', 'webp']
    ];

    if (!in_array($ext, $allowedExt[$subfolder] ?? ['jpg', 'png', 'mp3'])) {
        return ['success' => false, 'message' => 'Fòma fichye sa a pa otorize (' . htmlspecialchars($ext) . ').'];
    }

    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $uniqueName = $subfolder . '_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
    $destination = $targetDir . '/' . $uniqueName;

    if (move_uploaded_file($tmpName, $destination)) {
        $publicUrl = UPLOAD_URL . '/' . $subfolder . '/' . $uniqueName;
        return [
            'success' => true,
            'url' => $publicUrl,
            'fileName' => $uniqueName,
            'path' => $destination
        ];
    }

    return ['success' => false, 'message' => 'Enposib pou ekri fichye a sou sèvè Hostinger a.'];
}

/**
 * Rekipere paramèt platfòm lan
 */
function getPlatformConfig($key, $default = '') {
    $db = getDB();
    if (!$db) return $default;
    try {
        $stmt = $db->prepare("SELECT valeur FROM configurations WHERE cle = ?");
        $stmt->execute([$key]);
        $res = $stmt->fetch();
        return $res ? $res['valeur'] : $default;
    } catch (Exception $e) {
        return $default;
    }
}
