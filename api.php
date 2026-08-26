<?php
/**
 * UpMizik - RESTful JSON API pou Hostinger & MySQL
 * Jere tout operasyon SELECT, INSERT, UPDATE, DELETE pou Atis, Mizik, Don, ak Telechajman Fichye.
 * Retounen tout repons yo sou fòma JSON pou Frontend React la.
 */

// 1. En-têtes CORS & JSON pou koneksyon fasil ak React Frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Artist-Id');
header('Content-Type: application/json; charset=utf-8');

// Jere pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// Fonksyon pou voye repons JSON pwòp
function sendResponse($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Fonksyon pou detekte kolòn odyo a nan tab 'musiques' ('audioUrl' oswa 'audio_url')
 * sa pèmèt li konpatib 100% ak nenpòt estrikti baz done MySQL.
 */
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

/**
 * Fonksyon pou valide ak estoke fichye odyo avèk finfo_file ak move_uploaded_file
 * - Validasyon MIME strik avèk finfo_file: sèlman 'audio/mpeg' (MP3) oswa 'audio/wav' (WAV)
 * - Sèvi ak move_uploaded_file pou estoke odyo yo nan dosye /var/www/html/upmizik/uploads/
 * - Retounen chemen an pare pou sove nan kolòn 'audioUrl' nan baz done MySQL la
 */
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

    // MIME types otorize: sèlman 'audio/mpeg' (MP3) oswa 'audio/wav' (ak varyant estanda WAV)
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
            // Fallback sou dosye lokal si /var/www/html/upmizik/uploads pa aksesib
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

    // 4. Jenere yon non inik e sekirize pou fichye a
    $safeBase = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBase = substr($safeBase, 0, 40);
    $uniqueName = 'audio_' . time() . '_' . bin2hex(random_bytes(4)) . '_' . $safeBase . '.' . $ext;
    $destination = rtrim($targetDir, '/') . '/' . $uniqueName;

    // 5. Deplase fichye odyo a avèk move_uploaded_file
    if (move_uploaded_file($tmpName, $destination)) {
        // Pèmisyon lekti pou sèvè web
        @chmod($destination, 0644);

        // Chemen pou sove nan kolòn audioUrl nan MySQL
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

// Rekipere done POST/PUT an fòma JSON oswa Form Data
$inputData = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}
// Fizyone ak $_POST ak $_GET
$params = array_merge($_GET, $_POST, $inputData);
$action = $params['action'] ?? $_GET['action'] ?? '';

// Asire koneksyon ak baz done MySQL
$db = getDB();
if (!$db) {
    sendResponse(false, null, 'Erè: Baz done MySQL la pa konekte sou Hostinger. Tanpri verifye paramèt nan config.php.', 500);
}

// Routeur pou tout Aksyon API
try {
    switch ($action) {

        // =========================================================================
        // SECTION 1: ATIS (SELECT, INSERT, UPDATE)
        // =========================================================================

        /**
         * [SELECT] Rekipere lis tout atis yo oswa filtre pa estati
         * GET /api.php?action=get_artistes
         */
        case 'get_artistes':
        case 'list_artistes': {
            $statut = $params['statut'] ?? 'actif';
            $search = trim($params['search'] ?? '');
            
            $sql = "SELECT a.*, COUNT(m.id) as total_mizik 
                    FROM artistes a 
                    LEFT JOIN musiques m ON a.id = m.artiste_id AND m.statut = 'actif'";
            
            $conditions = [];
            $bindings = [];

            if ($statut !== 'tout') {
                $conditions[] = "a.statut = ?";
                $bindings[] = $statut;
            }

            if (!empty($search)) {
                $conditions[] = "(a.nom_scene LIKE ? OR a.nom_complet LIKE ? OR a.ville LIKE ?)";
                $bindings[] = "%$search%";
                $bindings[] = "%$search%";
                $bindings[] = "%$search%";
            }

            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }

            $sql .= " GROUP BY a.id ORDER BY a.total_ecoutes DESC, a.date_inscription DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($bindings);
            $artistes = $stmt->fetchAll();

            sendResponse(true, $artistes, 'Lis atis yo rekipere avèk siksè.');
            break;
        }

        /**
         * [SELECT] Rekipere yon sèl atis pa ID oswa Imèl ak tout mizik li yo
         * GET /api.php?action=get_artiste&id=art_123
         */
        case 'get_artiste': {
            $id = $params['id'] ?? '';
            $email = $params['email'] ?? '';

            if (empty($id) && empty($email)) {
                sendResponse(false, null, 'ID oswa Imèl atis la obligatwa.', 400);
            }

            if (!empty($id)) {
                $stmt = $db->prepare("SELECT * FROM artistes WHERE id = ?");
                $stmt->execute([$id]);
            } else {
                $stmt = $db->prepare("SELECT * FROM artistes WHERE email = ?");
                $stmt->execute([$email]);
            }

            $artiste = $stmt->fetch();
            if (!$artiste) {
                sendResponse(false, null, 'Atis sa a pa egziste nan baz done a.', 404);
            }

            // Rekipere mizik atis sa a
            $mStmt = $db->prepare("SELECT * FROM musiques WHERE artiste_id = ? ORDER BY ecoutes DESC, date_creation DESC");
            $mStmt->execute([$artiste['id']]);
            $artiste['musiques'] = $mStmt->fetchAll();

            // Rekipere donasyon resi pa atis sa a
            $dStmt = $db->prepare("SELECT * FROM dons WHERE artiste_id = ? AND statut = 'valide' ORDER BY date_don DESC LIMIT 10");
            $dStmt->execute([$artiste['id']]);
            $artiste['derniers_dons'] = $dStmt->fetchAll();

            sendResponse(true, $artiste, 'Detay atis la rekipere avèk siksè.');
            break;
        }

        /**
         * [INSERT] Enskri yon nouvo atis nan baz done MySQL
         * POST /api.php?action=insert_artiste
         */
        case 'insert_artiste':
        case 'create_artiste':
        case 'register_artiste': {
            $nomScene   = trim($params['nom_scene'] ?? '');
            $nomComplet = trim($params['nom_complet'] ?? $nomScene);
            $email      = trim($params['email'] ?? '');
            $telephone  = trim($params['telephone'] ?? '');
            $ville      = trim($params['ville'] ?? 'Pòtoprens');
            $pin        = trim($params['pin'] ?? '0000');
            $bio        = trim($params['bio'] ?? '');
            $avatarUrl  = trim($params['avatar_url'] ?? '');
            $preuveUrl  = trim($params['preuve_inscription_url'] ?? '');
            $youtube    = trim($params['youtube_url'] ?? '');
            $instagram  = trim($params['instagram_url'] ?? '');
            $tiktok     = trim($params['tiktok_url'] ?? '');

            if (empty($nomScene) || empty($email) || empty($telephone)) {
                sendResponse(false, null, 'Non sèn, imèl ak nimewo telefòn se chan obligatwa.', 400);
            }

            // Tcheke si email deja egziste
            $check = $db->prepare("SELECT id FROM artistes WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) {
                sendResponse(false, null, 'Imèl sa a deja anrejistre pou yon lòt atis.', 409);
            }

            // Si gen fichye upload dirèk
            if (isset($_FILES['avatar_file']) && $_FILES['avatar_file']['error'] === UPLOAD_ERR_OK) {
                $upAv = uploadServerFile($_FILES['avatar_file'], 'avatars');
                if ($upAv['success']) $avatarUrl = $upAv['url'];
            }
            if (isset($_FILES['preuve_file']) && $_FILES['preuve_file']['error'] === UPLOAD_ERR_OK) {
                $upPrv = uploadServerFile($_FILES['preuve_file'], 'preuves');
                if ($upPrv['success']) $preuveUrl = $upPrv['url'];
            }

            if (empty($avatarUrl)) {
                $avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            }

            $id = $params['id'] ?? ('art_' . time() . '_' . bin2hex(random_bytes(3)));
            $statut = $params['statut'] ?? 'en_attente'; // en_attente pa defo jiskaske admin valide $4.99
            $hashedPin = hashArtistPin($pin);

            $stmt = $db->prepare("
                INSERT INTO artistes (
                    id, nom_scene, nom_complet, email, telephone, ville, pin, 
                    avatar_url, bio, statut, preuve_inscription_url, 
                    youtube_url, instagram_url, tiktok_url, date_inscription
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?, ?, ?, NOW()
                )
            ");

            $stmt->execute([
                $id, $nomScene, $nomComplet, $email, $telephone, $ville, $hashedPin,
                $avatarUrl, $bio, $statut, $preuveUrl,
                $youtube, $instagram, $tiktok
            ]);

            // Rekipere atis ki fèk kreye a
            $getNew = $db->prepare("SELECT * FROM artistes WHERE id = ?");
            $getNew->execute([$id]);
            $newArtiste = $getNew->fetch();

            sendResponse(true, $newArtiste, 'Atis la anrejistre avèk siksè nan baz done a.', 201);
            break;
        }

        /**
         * [UPDATE] Mete ajou enfòmasyon yon atis (Pwofil, Biyografi, PIN, Estati, Bannière)
         * POST /api.php?action=update_artiste
         */
        case 'update_artiste': {
            $id = $params['id'] ?? '';
            if (empty($id)) {
                sendResponse(false, null, 'ID atis la obligatwa pou modifikasyon.', 400);
            }

            // Verifye si atis la egziste
            $check = $db->prepare("SELECT * FROM artistes WHERE id = ?");
            $check->execute([$id]);
            $existing = $check->fetch();
            if (!$existing) {
                sendResponse(false, null, 'Atis sa a pa jwenn nan baz done a.', 404);
            }

            // Jere upload fichye si genyen
            $avatarUrl = $params['avatar_url'] ?? $existing['avatar_url'];
            $banniereUrl = $params['banniere_url'] ?? $existing['banniere_url'];

            if (isset($_FILES['avatar_file']) && $_FILES['avatar_file']['error'] === UPLOAD_ERR_OK) {
                $upAv = uploadServerFile($_FILES['avatar_file'], 'avatars');
                if ($upAv['success']) $avatarUrl = $upAv['url'];
            }
            if (isset($_FILES['banniere_file']) && $_FILES['banniere_file']['error'] === UPLOAD_ERR_OK) {
                $upBan = uploadServerFile($_FILES['banniere_file'], 'bannieres');
                if ($upBan['success']) $banniereUrl = $upBan['url'];
            }

            $fieldsToUpdate = [
                'nom_scene'         => $params['nom_scene'] ?? $existing['nom_scene'],
                'nom_complet'       => $params['nom_complet'] ?? $existing['nom_complet'],
                'email'             => $params['email'] ?? $existing['email'],
                'telephone'         => $params['telephone'] ?? $existing['telephone'],
                'ville'             => $params['ville'] ?? $existing['ville'],
                'pin'               => $params['pin'] ?? $existing['pin'],
                'bio'               => $params['bio'] ?? $existing['bio'],
                'racines_musicales' => $params['racines_musicales'] ?? $existing['racines_musicales'],
                'influences'        => $params['influences'] ?? $existing['influences'],
                'vision_artistique' => $params['vision_artistique'] ?? $existing['vision_artistique'],
                'citation'          => $params['citation'] ?? $existing['citation'],
                'statut'            => $params['statut'] ?? $existing['statut'],
                'youtube_url'       => $params['youtube_url'] ?? $existing['youtube_url'],
                'instagram_url'     => $params['instagram_url'] ?? $existing['instagram_url'],
                'tiktok_url'        => $params['tiktok_url'] ?? $existing['tiktok_url'],
                'avatar_url'        => $avatarUrl,
                'banniere_url'      => $banniereUrl,
                'theme_banniere'    => $params['theme_banniere'] ?? $existing['theme_banniere']
            ];

            $setSql = [];
            $setVals = [];
            foreach ($fieldsToUpdate as $col => $val) {
                $setSql[] = "`$col` = ?";
                $setVals[] = $val;
            }
            $setVals[] = $id;

            $updateStmt = $db->prepare("UPDATE artistes SET " . implode(', ', $setSql) . " WHERE id = ?");
            $updateStmt->execute($setVals);

            // Rekipere done ki mete ajou yo
            $getUpdated = $db->prepare("SELECT * FROM artistes WHERE id = ?");
            $getUpdated->execute([$id]);
            $updatedArtiste = $getUpdated->fetch();

            sendResponse(true, $updatedArtiste, 'Pwofil atis la mete ajou avèk siksè.');
            break;
        }

        /**
         * [AUTH] Koneksyon Atis ak PIN sekirize (password_verify & JWT/Session Token)
         * POST /api.php?action=login_artiste
         */
        case 'login_artiste': {
            $email = trim($params['email'] ?? '');
            $pin   = trim($params['pin'] ?? '');

            $result = authenticateArtist($email, $pin, $db);
            if ($result['success']) {
                sendResponse(true, [
                    'token' => $result['token'],
                    'artiste' => $result['artist']
                ], $result['message'], 200);
            } else {
                $statusPayload = isset($result['statut']) ? ['statut' => $result['statut'], 'artiste' => $result['artist'] ?? null] : null;
                sendResponse(false, $statusPayload, $result['message'], $result['code'] ?? 401);
            }
            break;
        }

        /**
         * [AUTH] Verifikasyon Token/Sesyon pou artist_dashboard
         * GET/POST /api.php?action=verify_artist_auth
         */
        case 'verify_artist_auth': {
            $authedArtist = requireArtistAuth($db);
            if ($authedArtist) {
                sendResponse(true, [
                    'authenticated' => true,
                    'artiste' => $authedArtist
                ], 'Sesyon atis la valid ak aktif.');
            } else {
                sendResponse(false, ['authenticated' => false], 'Ou pa otorize oubyen kont atis ou a pa aktif.', 401);
            }
            break;
        }

        /**
         * [LOGS] Rekipere lis jounal aktivite & tantativ koneksyon yo
         * GET /api.php?action=get_activity_logs
         */
        case 'get_activity_logs':
        case 'list_logs_activite': {
            if (!$db) {
                sendResponse(true, [], 'Mòd offline: pa gen baz done konekte.');
            }

            // Asire tab la egziste
            $db->exec("
                CREATE TABLE IF NOT EXISTS `logs_activite` (
                  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                  `type_evenement` VARCHAR(64) NOT NULL,
                  `email` VARCHAR(255) NOT NULL,
                  `artiste_id` VARCHAR(64) DEFAULT NULL,
                  `nom_scene` VARCHAR(255) DEFAULT NULL,
                  `motif` TEXT NOT NULL,
                  `ip_adresse` VARCHAR(64) DEFAULT NULL,
                  `user_agent` TEXT DEFAULT NULL,
                  `statut` VARCHAR(32) NOT NULL DEFAULT 'warning',
                  `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  INDEX `idx_logs_email` (`email`),
                  INDEX `idx_logs_type` (`type_evenement`),
                  INDEX `idx_logs_statut` (`statut`),
                  INDEX `idx_logs_date` (`date_creation`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            $typeFilter = $params['type'] ?? '';
            $search = trim($params['search'] ?? '');
            $limit = isset($params['limit']) ? intval($params['limit']) : 100;
            $offset = isset($params['offset']) ? intval($params['offset']) : 0;

            $whereClauses = [];
            $queryParams = [];

            if (!empty($typeFilter) && $typeFilter !== 'all') {
                $whereClauses[] = "type_evenement = ?";
                $queryParams[] = $typeFilter;
            }

            if (!empty($search)) {
                $whereClauses[] = "(email LIKE ? OR nom_scene LIKE ? OR motif LIKE ? OR ip_adresse LIKE ?)";
                $searchWildcard = "%{$search}%";
                $queryParams[] = $searchWildcard;
                $queryParams[] = $searchWildcard;
                $queryParams[] = $searchWildcard;
                $queryParams[] = $searchWildcard;
            }

            $whereSQL = !empty($whereClauses) ? "WHERE " . implode(" AND ", $whereClauses) : "";
            $sql = "SELECT * FROM logs_activite {$whereSQL} ORDER BY date_creation DESC LIMIT {$limit} OFFSET {$offset}";

            $stmt = $db->prepare($sql);
            $stmt->execute($queryParams);
            $logs = $stmt->fetchAll();

            sendResponse(true, $logs, 'Jounal aktivite rekipere avèk siksè.');
            break;
        }

        /**
         * [LOGS] Anrejistre yon aktivite dirèkteman (depi frontend oswa sèvis)
         * POST /api.php?action=log_activity
         */
        case 'log_activity': {
            $eventType = $params['event_type'] ?? $params['eventType'] ?? 'autre';
            $email = trim($params['email'] ?? '');
            $artistId = $params['artist_id'] ?? $params['artistId'] ?? null;
            $artistName = $params['artist_name'] ?? $params['artistName'] ?? null;
            $reason = $params['reason'] ?? $params['motif'] ?? 'Tantativ aktivite';
            $status = $params['status'] ?? $params['statut'] ?? 'warning';

            $logged = logActivityEvent($eventType, $email, $artistId, $artistName, $reason, $status, $db);
            sendResponse(true, ['logged' => $logged], 'Aktivite anrejistre avèk siksè.');
            break;
        }

        /**
         * [LOGS] Efase tout log oswa yon log espesifik
         * POST /api.php?action=clear_activity_logs
         */
        case 'clear_activity_logs':
        case 'delete_activity_log': {
            if (!$db) {
                sendResponse(true, null, 'Mòd offline.');
            }

            $logId = $params['id'] ?? $params['log_id'] ?? null;
            if (!empty($logId)) {
                $stmt = $db->prepare("DELETE FROM logs_activite WHERE id = ?");
                $stmt->execute([$logId]);
                sendResponse(true, null, 'Log efase avèk siksè.');
            } else {
                $db->exec("TRUNCATE TABLE logs_activite");
                sendResponse(true, null, 'Tout jounal aktivite yo te netwaye avèk siksè.');
            }
            break;
        }


        // =========================================================================
        // SECTION 2: MIZIK (SELECT, INSERT, UPDATE, INCREMENT)
        // =========================================================================

        /**
         * [SELECT] Rekipere lis mizik yo ak filtè (Kategori, Atis, Recherche, Statut, Top)
         * GET /api.php?action=get_musiques
         */
        case 'get_musiques':
        case 'list_musiques': {
            $categorie = $params['categorie'] ?? 'Tout';
            $artisteId = $params['artiste_id'] ?? '';
            $statut    = $params['statut'] ?? 'actif';
            $search    = trim($params['search'] ?? '');
            $limit     = isset($params['limit']) ? intval($params['limit']) : 100;
            $offset    = isset($params['offset']) ? intval($params['offset']) : 0;
            $sort      = $params['sort'] ?? 'ecoutes'; // ecoutes, date, dons

            $sql = "SELECT m.*, a.avatar_url as avatar_artiste, a.nom_scene, a.ville as ville_artiste 
                    FROM musiques m 
                    LEFT JOIN artistes a ON m.artiste_id = a.id";

            $conditions = [];
            $bindings = [];

            if ($statut !== 'tout') {
                $conditions[] = "m.statut = ?";
                $bindings[] = $statut;
            }

            if ($categorie !== 'Tout' && !empty($categorie)) {
                $conditions[] = "m.categorie = ?";
                $bindings[] = $categorie;
            }

            if (!empty($artisteId)) {
                $conditions[] = "m.artiste_id = ?";
                $bindings[] = $artisteId;
            }

            if (!empty($search)) {
                $conditions[] = "(m.titre LIKE ? OR m.nom_artiste LIKE ? OR m.featuring LIKE ?)";
                $bindings[] = "%$search%";
                $bindings[] = "%$search%";
                $bindings[] = "%$search%";
            }

            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(" AND ", $conditions);
            }

            // Triye
            if ($sort === 'date') {
                $sql .= " ORDER BY m.date_creation DESC";
            } elseif ($sort === 'dons') {
                $sql .= " ORDER BY m.total_dons DESC, m.ecoutes DESC";
            } else {
                $sql .= " ORDER BY m.ecoutes DESC, m.date_creation DESC";
            }

            $sql .= " LIMIT $limit OFFSET $offset";

            $stmt = $db->prepare($sql);
            $stmt->execute($bindings);
            $musiques = $stmt->fetchAll();

            sendResponse(true, $musiques, 'Mizik yo rekipere avèk siksè.');
            break;
        }

        /**
         * [SELECT] Rekipere yon sèl mizik pa ID
         * GET /api.php?action=get_musique&id=mus_123
         */
        case 'get_musique': {
            $id = $params['id'] ?? '';
            if (empty($id)) {
                sendResponse(false, null, 'ID mizik la obligatwa.', 400);
            }

            $stmt = $db->prepare("
                SELECT m.*, a.avatar_url as avatar_artiste, a.nom_scene, a.bio as bio_artiste, a.telephone as tel_artiste 
                FROM musiques m 
                LEFT JOIN artistes a ON m.artiste_id = a.id 
                WHERE m.id = ?
            ");
            $stmt->execute([$id]);
            $musique = $stmt->fetch();

            if (!$musique) {
                sendResponse(false, null, 'Mizik sa a pa jwenn.', 404);
            }

            // Rekipere kòmantè
            $cStmt = $db->prepare("SELECT * FROM commentaires_musique WHERE musique_id = ? ORDER BY date_creation DESC LIMIT 20");
            $cStmt->execute([$id]);
            $musique['commentaires'] = $cStmt->fetchAll();

            // Rekipere dwa otè (split sheets)
            $crStmt = $db->prepare("SELECT * FROM credits_musique WHERE musique_id = ?");
            $crStmt->execute([$id]);
            $musique['credits'] = $crStmt->fetchAll();

            sendResponse(true, $musique, 'Detay mizik la rekipere avèk siksè.');
            break;
        }

        /**
         * [INSERT] Pibliye / Ajoute yon nouvo mizik nan baz done a
         * POST /api.php?action=insert_musique
         */
        case 'insert_musique':
        case 'create_musique':
        case 'publish_musique': {
            $titre      = trim($params['titre'] ?? '');
            $nomArtiste = trim($params['nom_artiste'] ?? '');
            $artisteId  = trim($params['artiste_id'] ?? '');
            $featuring  = trim($params['featuring'] ?? '');
            $categorie  = trim($params['categorie'] ?? 'Rap Kreyol');
            $format     = trim($params['format'] ?? 'single');
            $nomAlbum   = trim($params['nom_album'] ?? '');
            $audioUrl   = trim($params['audio_url'] ?? $params['audioUrl'] ?? '');
            $coverUrl   = trim($params['cover_url'] ?? $params['coverUrl'] ?? '');
            $duree      = intval($params['duree'] ?? 180);
            $youtube    = trim($params['youtube_url'] ?? '');
            $tiktok     = trim($params['tiktok_url'] ?? '');
            $instagram  = trim($params['instagram_url'] ?? '');

            if (empty($titre)) {
                sendResponse(false, null, 'Tit mizik la obligatwa.', 400);
            }

            // 1. Jere telechajman fichye odyo si li pase pa FormData (ak validasyon finfo_file & move_uploaded_file)
            $audioFileParam = $_FILES['audio_file'] ?? $_FILES['audioFile'] ?? $_FILES['audio'] ?? null;
            if ($audioFileParam && isset($audioFileParam['tmp_name']) && !empty($audioFileParam['tmp_name'])) {
                if ($audioFileParam['error'] === UPLOAD_ERR_OK) {
                    $audioUp = handleAudioUpload($audioFileParam);
                    if (!$audioUp['success']) {
                        sendResponse(false, null, 'Erè fichye odyo: ' . $audioUp['message'], 400);
                    }
                    $audioUrl = $audioUp['audioUrl'];
                } elseif ($audioFileParam['error'] !== UPLOAD_ERR_NO_FILE) {
                    $audioUp = handleAudioUpload($audioFileParam);
                    sendResponse(false, null, 'Erè telechajman odyo: ' . $audioUp['message'], 400);
                }
            }

            // 2. Jere telechajman foto kouvèti si genyen
            if (isset($_FILES['cover_file']) && $_FILES['cover_file']['error'] === UPLOAD_ERR_OK) {
                $coverUp = uploadServerFile($_FILES['cover_file'], 'covers');
                if ($coverUp['success']) {
                    $coverUrl = $coverUp['url'];
                }
            }

            if (empty($audioUrl)) {
                sendResponse(false, null, 'Fichye odyo (MP3 oswa WAV) oswa lyen audioUrl obligatwa pou pibliye mizik la.', 400);
            }

            // Verifye si audioUrl la valide (URL entènèt oswa chemen lokal /uploads/)
            if (!filter_var($audioUrl, FILTER_VALIDATE_URL) && strpos($audioUrl, '/uploads/') !== 0 && strpos($audioUrl, 'idb:') !== 0 && strpos($audioUrl, '/var/www/html/upmizik/uploads') !== 0) {
                sendResponse(false, null, 'Chemen oswa lyen fichye odyo a pa valid pou lekti.', 400);
            }

            if (empty($coverUrl)) {
                $coverUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
            }

            // Asire gen yon atis ki lye ak mizik la
            if (empty($artisteId)) {
                if (empty($nomArtiste)) {
                    $nomArtiste = 'Atis Enkoni';
                }
                // Chèche si atis la egziste deja
                $findArt = $db->prepare("SELECT id FROM artistes WHERE nom_scene = ? LIMIT 1");
                $findArt->execute([$nomArtiste]);
                $found = $findArt->fetch();
                if ($found) {
                    $artisteId = $found['id'];
                } else {
                    $artisteId = 'art_' . time() . '_' . bin2hex(random_bytes(2));
                    $db->prepare("INSERT INTO artistes (id, nom_scene, nom_complet, email, telephone, statut) VALUES (?, ?, ?, ?, ?, 'actif')")
                       ->execute([$artisteId, $nomArtiste, $nomArtiste, 'artist_'.time().'@upmizik.local', '+50900000000']);
                }
            } else {
                // Pran non sèn nan baz done a si li pa voye l
                if (empty($nomArtiste)) {
                    $getA = $db->prepare("SELECT nom_scene FROM artistes WHERE id = ?");
                    $getA->execute([$artisteId]);
                    $rowA = $getA->fetch();
                    $nomArtiste = $rowA['nom_scene'] ?? 'Atis UpMizik';
                }
            }

            $id = $params['id'] ?? ('mus_' . time() . '_' . bin2hex(random_bytes(3)));
            $statut = $params['statut'] ?? 'actif';

            // Detekte non kolòn audio nan tab musiques la ('audioUrl' oswa 'audio_url')
            $audioCol = getMusiquesAudioColumn($db);

            $stmt = $db->prepare("
                INSERT INTO musiques (
                    id, titre, artiste_id, nom_artiste, featuring, categorie, 
                    format, nom_album, cover_url, `{$audioCol}`, duree, 
                    youtube_url, tiktok_url, instagram_url, statut, date_creation
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, NOW()
                )
            ");

            $stmt->execute([
                $id, $titre, $artisteId, $nomArtiste, $featuring, $categorie,
                $format, $nomAlbum, $coverUrl, $audioUrl, $duree,
                $youtube, $tiktok, $instagram, $statut
            ]);

            // Rekipere mizik ki fèk anrejistre a
            $getM = $db->prepare("SELECT * FROM musiques WHERE id = ?");
            $getM->execute([$id]);
            $newMusique = $getM->fetch();
            if ($newMusique) {
                // Asire tou de kle yo disponib nan repons JSON
                $newMusique['audioUrl'] = $newMusique[$audioCol] ?? $audioUrl;
                $newMusique['audio_url'] = $newMusique[$audioCol] ?? $audioUrl;
            }

            sendResponse(true, $newMusique, 'Mizik la anrejistre epi fichye odyo a estoke avèk siksè nan /var/www/html/upmizik/uploads/ epi sove nan kolòn ' . $audioCol . ' nan MySQL!', 201);
            break;
        }

        /**
         * [UPDATE] Mete ajou enfòmasyon yon mizik (Tit, Kategori, Featuring, Lyen, Cover, etc.)
         * POST /api.php?action=update_musique
         */
        case 'update_musique': {
            $id = $params['id'] ?? '';
            if (empty($id)) {
                sendResponse(false, null, 'ID mizik la obligatwa pou mizajou.', 400);
            }

            $check = $db->prepare("SELECT * FROM musiques WHERE id = ?");
            $check->execute([$id]);
            $existing = $check->fetch();
            if (!$existing) {
                sendResponse(false, null, 'Mizik sa a pa egziste nan baz done a.', 404);
            }

            $audioCol = getMusiquesAudioColumn($db);
            $coverUrl = $params['cover_url'] ?? $params['coverUrl'] ?? $existing['cover_url'] ?? ($existing['coverUrl'] ?? '');
            $audioUrl = $params['audio_url'] ?? $params['audioUrl'] ?? $existing[$audioCol] ?? ($existing['audio_url'] ?? ($existing['audioUrl'] ?? ''));

            if (isset($_FILES['cover_file']) && $_FILES['cover_file']['error'] === UPLOAD_ERR_OK) {
                $upCov = uploadServerFile($_FILES['cover_file'], 'covers');
                if ($upCov['success']) $coverUrl = $upCov['url'];
            }

            $audioFileParam = $_FILES['audio_file'] ?? $_FILES['audioFile'] ?? $_FILES['audio'] ?? null;
            if ($audioFileParam && isset($audioFileParam['tmp_name']) && !empty($audioFileParam['tmp_name']) && $audioFileParam['error'] === UPLOAD_ERR_OK) {
                $upAud = handleAudioUpload($audioFileParam);
                if (!$upAud['success']) {
                    sendResponse(false, null, 'Erè telechajman nouvo fichye odyo: ' . $upAud['message'], 400);
                }
                $audioUrl = $upAud['audioUrl'];
            }

            $fields = [
                'titre'         => $params['titre'] ?? $existing['titre'],
                'nom_artiste'   => $params['nom_artiste'] ?? $existing['nom_artiste'],
                'featuring'     => $params['featuring'] ?? $existing['featuring'],
                'categorie'     => $params['categorie'] ?? $existing['categorie'],
                'format'        => $params['format'] ?? $existing['format'],
                'nom_album'     => $params['nom_album'] ?? $existing['nom_album'],
                'duree'         => isset($params['duree']) ? intval($params['duree']) : $existing['duree'],
                'statut'        => $params['statut'] ?? $existing['statut'],
                'youtube_url'   => $params['youtube_url'] ?? $existing['youtube_url'],
                'tiktok_url'    => $params['tiktok_url'] ?? $existing['tiktok_url'],
                'instagram_url' => $params['instagram_url'] ?? $existing['instagram_url'],
                'cover_url'     => $coverUrl,
                $audioCol       => $audioUrl
            ];

            $sqlParts = [];
            $vals = [];
            foreach ($fields as $col => $val) {
                $sqlParts[] = "`$col` = ?";
                $vals[] = $val;
            }
            $vals[] = $id;

            $updateStmt = $db->prepare("UPDATE musiques SET " . implode(', ', $sqlParts) . " WHERE id = ?");
            $updateStmt->execute($vals);

            $getUp = $db->prepare("SELECT * FROM musiques WHERE id = ?");
            $getUp->execute([$id]);
            $updatedM = $getUp->fetch();
            if ($updatedM) {
                $updatedM['audioUrl'] = $updatedM[$audioCol] ?? $audioUrl;
                $updatedM['audio_url'] = $updatedM[$audioCol] ?? $audioUrl;
            }

            sendResponse(true, $updatedM, 'Mizik la mete ajou avèk siksè nan baz done a.');
            break;
        }

        /**
         * [UPDATE] Ogmante kantite kout zòrèy / plays (increment) pou mizik ak atis
         * POST /api.php?action=increment_ecoutes
         */
        case 'increment_ecoutes':
        case 'play_track': {
            $id = $params['id'] ?? $params['musique_id'] ?? '';
            if (empty($id)) {
                sendResponse(false, null, 'ID mizik la obligatwa.', 400);
            }

            // Mete ajou nan musiques
            $stmt = $db->prepare("UPDATE musiques SET ecoutes = ecoutes + 1 WHERE id = ?");
            $stmt->execute([$id]);

            // Mete ajou nan artistes tou
            $getArt = $db->prepare("SELECT artiste_id FROM musiques WHERE id = ?");
            $getArt->execute([$id]);
            $row = $getArt->fetch();
            if ($row && !empty($row['artiste_id'])) {
                $db->prepare("UPDATE artistes SET total_ecoutes = total_ecoutes + 1 WHERE id = ?")
                   ->execute([$row['artiste_id']]);
            }

            sendResponse(true, ['musique_id' => $id], 'Kout zòrèy la anrejistre avèk siksè.');
            break;
        }

        /**
         * [DELETE] Efase yon mizik
         * POST /api.php?action=delete_musique
         */
        case 'delete_musique': {
            $id = $params['id'] ?? '';
            if (empty($id)) {
                sendResponse(false, null, 'ID mizik la obligatwa.', 400);
            }

            $stmt = $db->prepare("DELETE FROM musiques WHERE id = ?");
            $stmt->execute([$id]);

            sendResponse(true, ['id' => $id], 'Mizik la efase avèk siksè.');
            break;
        }


        // =========================================================================
        // SECTION 3: DONS & SIPÒ (SELECT, INSERT, UPDATE)
        // =========================================================================

        /**
         * [SELECT] Rekipere donasyon yo
         * GET /api.php?action=get_dons
         */
        case 'get_dons': {
            $artisteId = $params['artiste_id'] ?? '';
            $statut    = $params['statut'] ?? 'tout';

            $sql = "SELECT * FROM dons";
            $conds = [];
            $binds = [];

            if (!empty($artisteId)) {
                $conds[] = "artiste_id = ?";
                $binds[] = $artisteId;
            }
            if ($statut !== 'tout') {
                $conds[] = "statut = ?";
                $binds[] = $statut;
            }

            if (!empty($conds)) {
                $sql .= " WHERE " . implode(" AND ", $conds);
            }
            $sql .= " ORDER BY date_don DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($binds);
            $dons = $stmt->fetchAll();

            sendResponse(true, $dons, 'Lis donasyon yo rekipere avèk siksè.');
            break;
        }

        /**
         * [INSERT] Kreye yon nouvo donasyon ak prèv transfè MonCash/Natcash
         * POST /api.php?action=insert_don
         */
        case 'insert_don':
        case 'create_don': {
            $artisteId          = trim($params['artiste_id'] ?? '');
            $musiqueId          = trim($params['musique_id'] ?? '');
            $nomArtiste         = trim($params['nom_artiste'] ?? 'Atis UpMizik');
            $titreMusique       = trim($params['titre_musique'] ?? 'Donasyon Dirèk');
            $montant            = floatval($params['montant'] ?? 1.00);
            $devise             = trim($params['devise'] ?? 'USD');
            $nomDonateur        = trim($params['nom_donateur'] ?? 'Fanatik UpMizik');
            $telephoneDonateur  = trim($params['telephone_donateur'] ?? '');
            $methodePaiement    = trim($params['methode_paiement'] ?? 'MonCash');
            $preuveUrl          = trim($params['preuve_url'] ?? '');

            if ($montant <= 0 || empty($telephoneDonateur)) {
                sendResponse(false, null, 'Montan ak nimewo telefòn se chan obligatwa.', 400);
            }

            // Jere upload foto prèv
            if (isset($_FILES['preuve_file']) && $_FILES['preuve_file']['error'] === UPLOAD_ERR_OK) {
                $upPrv = uploadServerFile($_FILES['preuve_file'], 'preuves');
                if ($upPrv['success']) {
                    $preuveUrl = $upPrv['url'];
                }
            }

            if (empty($preuveUrl)) {
                sendResponse(false, null, 'Tanpri bay yon prèv transfè (foto screenshot oswa URL).', 400);
            }

            // Kalkil 85% pou atis la ak 15% pou platfòm lan
            $partArtiste = round($montant * 0.85, 2);
            $partPlateforme = round($montant * 0.15, 2);
            $id = $params['id'] ?? ('don_' . time() . '_' . bin2hex(random_bytes(3)));

            $stmt = $db->prepare("
                INSERT INTO dons (
                    id, musique_id, titre_musique, artiste_id, nom_artiste, 
                    montant, devise, nom_donateur, telephone_donateur, 
                    preuve_url, methode_paiement, statut, 
                    part_artiste, part_plateforme, date_don
                ) VALUES (
                    ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?, ?, 'en_attente', 
                    ?, ?, NOW()
                )
            ");

            $stmt->execute([
                $id, $musiqueId, $titreMusique, $artisteId, $nomArtiste,
                $montant, $devise, $nomDonateur, $telephoneDonateur,
                $preuveUrl, $methodePaiement,
                $partArtiste, $partPlateforme
            ]);

            // Kreye mesaj notifikasyon nan bwat resepsyon atis la si artiste_id egziste
            if (!empty($artisteId)) {
                $msgId = 'msg_' . time() . '_' . bin2hex(random_bytes(2));
                $db->prepare("
                    INSERT INTO messages_inbox (
                        id, artiste_id, nom_artiste, email_destinataire, type, 
                        sujet, apercu, contenu, est_lu, details_don, date_reception
                    ) VALUES (
                        ?, ?, ?, 'artist@upmizik.com', 'nouveau_don',
                        'Nouvo Donasyon Resi: $' || ?, 'Ou resevwa yon don de $' || ? || ' soti nan men ' || ?,
                        'Felisitasyon! Fanatik ' || ? || ' fèk voye yon don de $' || ? || ' pou mizik ' || ? || '. Lajan an pral transfere sou MonCash/Natcash ou apre validasyon.',
                        0, ?, NOW()
                    )
                ")->execute([
                    $msgId, $artisteId, $nomArtiste, $montant, $montant, $nomDonateur,
                    $nomDonateur, $montant, $titreMusique, json_encode(['don_id' => $id, 'montant' => $montant, 'part_artiste' => $partArtiste])
                ]);
            }

            $getDon = $db->prepare("SELECT * FROM dons WHERE id = ?");
            $getDon->execute([$id]);
            $newDon = $getDon->fetch();

            sendResponse(true, $newDon, 'Donasyon an anrejistre avèk siksè epi li an atant validasyon.', 201);
            break;
        }

        /**
         * [UPDATE] Valide oswa Rejte yon Donasyon (Admin)
         * POST /api.php?action=update_don_statut
         */
        case 'update_don_statut': {
            $id     = $params['id'] ?? '';
            $statut = $params['statut'] ?? 'valide'; // valide, rejete

            if (empty($id)) {
                sendResponse(false, null, 'ID donasyon an obligatwa.', 400);
            }

            $getD = $db->prepare("SELECT * FROM dons WHERE id = ?");
            $getD->execute([$id]);
            $don = $getD->fetch();

            if (!$don) {
                sendResponse(false, null, 'Donasyon sa a pa egziste.', 404);
            }

            $stmt = $db->prepare("UPDATE dons SET statut = ? WHERE id = ?");
            $stmt->execute([$statut, $id]);

            // Si li valide, mete ajou total dons atis la ak mizik la
            if ($statut === 'valide') {
                if (!empty($don['artiste_id'])) {
                    $db->prepare("UPDATE artistes SET total_dons_recus = total_dons_recus + ? WHERE id = ?")
                       ->execute([$don['part_artiste'], $don['artiste_id']]);
                }
                if (!empty($don['musique_id'])) {
                    $db->prepare("UPDATE musiques SET total_dons = total_dons + ? WHERE id = ?")
                       ->execute([$don['montant'], $don['musique_id']]);
                }
            }

            sendResponse(true, ['id' => $id, 'statut' => $statut], "Estati donasyon an chanje pou: $statut.");
            break;
        }


        // =========================================================================
        // SECTION 4: TELECHAJMAN FICHYE DIRÈK (UPLOAD API)
        // =========================================================================

        /**
         * [INSERT] Telechaje fichye odyo sèlman ak validasyon finfo_file (MP3/WAV)
         * POST /api.php?action=upload_audio
         */
        case 'upload_audio': {
            $audioFile = $_FILES['file'] ?? $_FILES['audio_file'] ?? $_FILES['audio'] ?? null;
            if (!$audioFile) {
                sendResponse(false, null, 'Okenn fichye odyo pa voye nan requèt la (chan "file" oswa "audio_file" manke).', 400);
            }

            $res = handleAudioUpload($audioFile);
            if (!$res['success']) {
                sendResponse(false, null, $res['message'], 400);
            }

            // Si yon musique_id te voye, mete ajou kolòn audioUrl la dirèkteman nan baz done a
            $musiqueId = $params['musique_id'] ?? $params['id'] ?? '';
            if (!empty($musiqueId)) {
                $audioCol = getMusiquesAudioColumn($db);
                $upDb = $db->prepare("UPDATE musiques SET `{$audioCol}` = ? WHERE id = ?");
                $upDb->execute([$res['audioUrl'], $musiqueId]);
            }

            sendResponse(true, $res, 'Fichye odyo a valide (MIME: ' . $res['mimeType'] . ') epi estoke avèk siksè nan /var/www/html/upmizik/uploads/.', 200);
            break;
        }

        /**
         * [INSERT] Telechaje nenpòt fichye (Odyo, Cover, Avatar, Prèv)
         * POST /api.php?action=upload_file
         */
        case 'upload_file': {
            $folder = $params['folder'] ?? 'musiques'; // musiques, covers, preuves, avatars, bannieres
            $fileToUpload = $_FILES['file'] ?? $_FILES['audio_file'] ?? $_FILES['cover_file'] ?? null;

            if (!$fileToUpload) {
                sendResponse(false, null, 'Okenn fichye pa voye nan requèt la (chan "file" manke).', 400);
            }

            // Si se yon fichye odyo (musiques oswa audio), pase pa handleAudioUpload ak finfo_file
            if ($folder === 'musiques' || $folder === 'audio') {
                $res = handleAudioUpload($fileToUpload);
            } else {
                $res = uploadServerFile($fileToUpload, $folder);
            }

            if ($res['success']) {
                sendResponse(true, $res, 'Fichye a telechaje avèk siksè sou sèvè a.', 200);
            } else {
                sendResponse(false, null, $res['message'], 400);
            }
            break;
        }


        // =========================================================================
        // SECTION 5: STATISTIK & KONFIGIRASYON PLATFÒM LAN
        // =========================================================================

        /**
         * [SELECT] Statistik Jeneral pou Dashboard ak Admin
         * GET /api.php?action=get_stats
         */
        case 'get_stats': {
            $totalArtistes = $db->query("SELECT COUNT(*) as c FROM artistes WHERE statut = 'actif'")->fetch()['c'] ?? 0;
            $totalMusiques = $db->query("SELECT COUNT(*) as c FROM musiques WHERE statut = 'actif'")->fetch()['c'] ?? 0;
            $totalEcoutes  = $db->query("SELECT SUM(ecoutes) as c FROM musiques")->fetch()['c'] ?? 0;
            $totalDons     = $db->query("SELECT SUM(montant) as total, COUNT(*) as count FROM dons WHERE statut = 'valide'")->fetch();
            $pendingArts   = $db->query("SELECT COUNT(*) as c FROM artistes WHERE statut = 'en_attente'")->fetch()['c'] ?? 0;
            $pendingDons   = $db->query("SELECT COUNT(*) as c FROM dons WHERE statut = 'en_attente'")->fetch()['c'] ?? 0;

            sendResponse(true, [
                'total_artistes' => intval($totalArtistes),
                'total_musiques' => intval($totalMusiques),
                'total_ecoutes'  => intval($totalEcoutes),
                'total_dons_usd' => floatval($totalDons['total'] ?? 0),
                'nombre_dons'    => intval($totalDons['count'] ?? 0),
                'artistes_en_attente' => intval($pendingArts),
                'dons_en_attente'     => intval($pendingDons)
            ], 'Statistik jeneral platfòm lan rekipere avèk siksè.');
            break;
        }

        /**
         * [SELECT] Rekipere Konfigirasyon Platfòm lan (MonCash, Natcash, Pousantaj)
         * GET /api.php?action=get_config
         */
        case 'get_config': {
            $stmt = $db->query("SELECT * FROM configurations");
            $rows = $stmt->fetchAll();
            $config = [];
            foreach ($rows as $r) {
                $config[$r['cle']] = $r['valeur'];
            }
            sendResponse(true, $config, 'Konfigirasyon platfòm lan rekipere.');
            break;
        }

        default:
            sendResponse(false, null, "Aksyon enkoni ('" . htmlspecialchars($action) . "'). Aksyon ki disponib yo: get_artistes, get_artiste, insert_artiste, update_artiste, get_musiques, get_musique, insert_musique, update_musique, increment_ecoutes, delete_musique, get_dons, insert_don, update_don_statut, upload_file, get_stats, get_config.", 400);
            break;
    }

} catch (Exception $e) {
    sendResponse(false, null, 'Erè Sèvè / MySQL: ' . $e->getMessage(), 500);
}
