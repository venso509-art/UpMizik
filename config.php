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
 * Fonksyon pou verifye epi sove fichye ki telechaje sou sèvè Hostinger
 * Enkli validasyon MIME type, gwosè fichye, ekstansyon, ak kreye chemen URL relatif/absoli
 */
function uploadServerFile($file, $subfolder = 'musiques') {
    if (!isset($file) || !is_array($file)) {
        return ['success' => false, 'message' => 'Okenn fichye pa voye nan requèt la.'];
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE   => 'Fichye a twò gwo (depase limit upload_max_filesize nan php.ini).',
            UPLOAD_ERR_FORM_SIZE  => 'Fichye a depase limit MAX_FILE_SIZE fòmilè a.',
            UPLOAD_ERR_PARTIAL    => 'Fichye a te telechaje an pati sèlman.',
            UPLOAD_ERR_NO_FILE    => 'Okenn fichye pa t seleksyone.',
            UPLOAD_ERR_NO_TMP_DIR => 'Dosye tanporè sèvè a manke.',
            UPLOAD_ERR_CANT_WRITE => 'Echèk pou ekri fichye a sou disk sèvè a.',
            UPLOAD_ERR_EXTENSION  => 'Yon ekstansyon PHP te kanpe telechajman an.'
        ];
        $msg = $uploadErrors[$file['error']] ?? 'Erè pandan telechajman fichye a (kòd: ' . $file['error'] . ').';
        return ['success' => false, 'message' => $msg];
    }

    $allowedFolders = ['musiques', 'covers', 'preuves', 'avatars', 'bannieres'];
    if (!in_array($subfolder, $allowedFolders)) {
        $subfolder = 'musiques';
    }

    $targetDir = UPLOAD_DIR . '/' . $subfolder;
    if (!file_exists($targetDir)) {
        @mkdir($targetDir, 0755, true);
    }

    // Verifye pèmisyon dosye a pou ekriti
    if (!is_writable($targetDir)) {
        @chmod($targetDir, 0755);
        if (!is_writable($targetDir)) {
            return ['success' => false, 'message' => "Dosye /uploads/{$subfolder} la pa gen pèmisyon pou ekri. Tanpri asire www-data gen pèmisyon 755."];
        }
    }

    $originalName = $file['name'];
    $tmpName = $file['tmp_name'];
    $fileSize = $file['size'] ?? 0;
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // Limit gwosè: 100MB pou mizik, 15MB pou foto/dokiman
    $maxSizes = [
        'musiques' => 100 * 1024 * 1024, // 100 MB
        'covers'   => 15 * 1024 * 1024,  // 15 MB
        'preuves'  => 15 * 1024 * 1024,  // 15 MB
        'avatars'  => 10 * 1024 * 1024,  // 10 MB
        'bannieres'=> 15 * 1024 * 1024   // 15 MB
    ];

    if ($fileSize > ($maxSizes[$subfolder] ?? (20 * 1024 * 1024))) {
        $maxMB = round(($maxSizes[$subfolder] ?? (20 * 1024 * 1024)) / (1024 * 1024));
        return ['success' => false, 'message' => "Gwosè fichye a depase limit maksimòm otorize a ({$maxMB} MB)."];
    }

    // Ekstansyon ak MIME types otorize
    $allowedExt = [
        'musiques' => ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'],
        'covers'   => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        'preuves'  => ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        'avatars'  => ['jpg', 'jpeg', 'png', 'webp'],
        'bannieres'=> ['jpg', 'jpeg', 'png', 'webp']
    ];

    if (!in_array($ext, $allowedExt[$subfolder] ?? ['jpg', 'png', 'mp3', 'wav'])) {
        return ['success' => false, 'message' => 'Fòma fichye sa a pa otorize (.' . htmlspecialchars($ext) . '). Tanpri itilize ' . implode(', ', $allowedExt[$subfolder]) . '.'];
    }

    // Verifikasyon MIME Type ak finfo si disponib
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $tmpName);
        finfo_close($finfo);

        if ($subfolder === 'musiques') {
            $validAudioMimes = [
                'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 
                'audio/x-pn-wav', 'audio/aac', 'audio/x-m4a', 'audio/mp4', 'audio/ogg', 'audio/flac', 
                'application/octet-stream' // Kèk sistèm voye mp3 an octet-stream
            ];
            if (!in_array($mime, $validAudioMimes) && strpos($mime, 'audio/') !== 0) {
                return ['success' => false, 'message' => 'Fichye odyo a pa valid oswa li korompi (MIME: ' . htmlspecialchars($mime) . ').'];
            }
        }
    }

    $safeBase = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBase = substr($safeBase, 0, 40);
    $uniqueName = $subfolder . '_' . time() . '_' . bin2hex(random_bytes(3)) . '_' . $safeBase . '.' . $ext;
    $destination = $targetDir . '/' . $uniqueName;

    if (move_uploaded_file($tmpName, $destination)) {
        // Asire pèmisyon lekti pou sèvè web Nginx
        @chmod($destination, 0644);
        
        $publicUrl = UPLOAD_URL . '/' . $subfolder . '/' . $uniqueName;
        $relativePath = '/uploads/' . $subfolder . '/' . $uniqueName;

        return [
            'success'      => true,
            'url'          => $publicUrl,
            'relativePath' => $relativePath,
            'fileName'     => $uniqueName,
            'originalName' => $originalName,
            'size'         => $fileSize,
            'extension'    => $ext,
            'path'         => $destination
        ];
    }

    return ['success' => false, 'message' => 'Enposib pou ekri fichye a sou sèvè Hostinger a. Tanpri verifye espas disk ak pèmisyon dosye /uploads/.'];
}

/**
 * Fonksyon pou detekte kolòn odyo a nan tab 'musiques' ('audioUrl' oswa 'audio_url')
 */
if (!function_exists('getMusiquesAudioColumn')) {
    function getMusiquesAudioColumn($db) {
        static $audioCol = null;
        if ($audioCol !== null) return $audioCol;

        try {
            $cols = $db->query("SHOW COLUMNS FROM musiques")->fetchAll(PDO::FETCH_COLUMN);
            if (is_array($cols)) {
                if (in_array('audioUrl', $cols)) {
                    $audioCol = 'audioUrl';
                    return $audioCol;
                }
                if (in_array('audio_url', $cols)) {
                    $audioCol = 'audio_url';
                    return $audioCol;
                }
            }
        } catch (Exception $e) {}

        $audioCol = 'audio_url';
        return $audioCol;
    }
}

/**
 * Fonksyon pou valide ak estoke fichye odyo avèk finfo_file ak move_uploaded_file
 * - Validasyon MIME strik avèk finfo_file: sèlman 'audio/mpeg' (MP3) oswa 'audio/wav' (WAV)
 * - Sèvi ak move_uploaded_file pou estoke odyo yo nan dosye /var/www/html/upmizik/uploads/
 * - Retounen chemen an pare pou sove nan kolòn 'audioUrl' nan baz done MySQL la
 */
if (!function_exists('handleAudioUpload')) {
    function handleAudioUpload($file) {
        if (!isset($file) || !is_array($file)) {
            return ['success' => false, 'message' => 'Okenn fichye odyo pa voye nan requèt la.'];
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $uploadErrors = [
                UPLOAD_ERR_INI_SIZE   => 'Fichye a twò gwo (depase limit upload_max_filesize nan php.ini).',
                UPLOAD_ERR_FORM_SIZE  => 'Fichye a depase limit MAX_FILE_SIZE fòmilè a.',
                UPLOAD_ERR_PARTIAL    => 'Fichye a te telechaje an pati sèlman.',
                UPLOAD_ERR_NO_FILE    => 'Okenn fichye pa t seleksyone.',
                UPLOAD_ERR_NO_TMP_DIR => 'Dosye tanporè sèvè a manke.',
                UPLOAD_ERR_CANT_WRITE => 'Echèk pou ekri fichye a sou disk sèvè a.',
                UPLOAD_ERR_EXTENSION  => 'Yon ekstansyon PHP te kanpe telechajman an.'
            ];
            $msg = $uploadErrors[$file['error']] ?? ('Erè pandan telechajman fichye odyo a (kòd: ' . $file['error'] . ').');
            return ['success' => false, 'message' => $msg];
        }

        $tmpName = $file['tmp_name'];
        $originalName = $file['name'];
        $fileSize = $file['size'] ?? 0;
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // 1. Validasyon ekstansyon fichye (sèlman mp3 oswa wav)
        $allowedExtensions = ['mp3', 'wav'];
        if (!in_array($ext, $allowedExtensions)) {
            return [
                'success' => false,
                'message' => 'Fòma fichye sa a pa otorize (.' . htmlspecialchars($ext) . '). Se sèlman fichye MP3 (.mp3) oswa WAV (.wav) ki otorize pou lekti mizik.'
            ];
        }

        // 2. Validasyon strik MIME Type avèk finfo_file
        $mimeType = '';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $tmpName);
            finfo_close($finfo);
        } elseif (function_exists('mime_content_type')) {
            $mimeType = mime_content_type($tmpName);
        }

        // MIME types otorize: sèlman 'audio/mpeg' (MP3) oswa 'audio/wav' (ak varyant WAV estanda)
        $allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp3'];
        if (!empty($mimeType) && !in_array($mimeType, $allowedMimes)) {
            return [
                'success' => false,
                'message' => "Tip fichye odyo a pa valid (MIME detekte: " . htmlspecialchars($mimeType) . "). Se sèlman 'audio/mpeg' (MP3) oswa 'audio/wav' ki aksepte sou platfòm lan."
            ];
        }

        // 3. Konfigirasyon dosye sib: /var/www/html/upmizik/uploads/
        $primaryTargetDir = '/var/www/html/upmizik/uploads';
        $fallbackTargetDir = defined('UPLOAD_DIR') ? UPLOAD_DIR . '/musiques' : (__DIR__ . '/uploads/musiques');

        $targetDir = $primaryTargetDir;
        if (!file_exists($targetDir)) {
            if (!@mkdir($targetDir, 0755, true)) {
                $targetDir = $fallbackTargetDir;
                if (!file_exists($targetDir)) {
                    @mkdir($targetDir, 0755, true);
                }
            }
        }

        if (!is_writable($targetDir)) {
            @chmod($targetDir, 0755);
            if (!is_writable($targetDir)) {
                $targetDir = $fallbackTargetDir;
                if (!file_exists($targetDir)) {
                    @mkdir($targetDir, 0755, true);
                }
                @chmod($targetDir, 0755);
            }
        }

        // 4. Jenere non inik e sekirize pou fichye a
        $safeBase = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
        $safeBase = substr($safeBase, 0, 40);
        $uniqueName = 'audio_' . time() . '_' . bin2hex(random_bytes(4)) . '_' . $safeBase . '.' . $ext;
        $destination = rtrim($targetDir, '/') . '/' . $uniqueName;

        // 5. Deplase fichye odyo a avèk move_uploaded_file
        if (move_uploaded_file($tmpName, $destination)) {
            @chmod($destination, 0644);

            if (strpos($destination, '/var/www/html/upmizik/uploads') !== false) {
                $audioUrl = '/uploads/' . $uniqueName;
            } else {
                $audioUrl = (defined('UPLOAD_URL') ? UPLOAD_URL : '/uploads') . '/musiques/' . $uniqueName;
            }

            return [
                'success'      => true,
                'audioUrl'     => $audioUrl,
                'url'          => $audioUrl,
                'relativePath' => $audioUrl,
                'fileName'     => $uniqueName,
                'originalName' => $originalName,
                'size'         => $fileSize,
                'mimeType'     => $mimeType ?: ('audio/' . $ext),
                'path'         => $destination
            ];
        }

        return [
            'success' => false,
            'message' => 'Echèk pandan deplasman fichye odyo a (move_uploaded_file) nan dosye /var/www/html/upmizik/uploads/.'
        ];
    }
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
