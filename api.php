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
                $id, $nomScene, $nomComplet, $email, $telephone, $ville, $pin,
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
         * [UPDATE] Koneksyon Atis ak PIN
         * POST /api.php?action=login_artiste
         */
        case 'login_artiste': {
            $email = trim($params['email'] ?? '');
            $pin   = trim($params['pin'] ?? '');

            if (empty($email) || empty($pin)) {
                sendResponse(false, null, 'Tanpri antre imèl ak kòd PIN ou.', 400);
            }

            $stmt = $db->prepare("SELECT * FROM artistes WHERE email = ? AND pin = ?");
            $stmt->execute([$email, $pin]);
            $artiste = $stmt->fetch();

            if ($artiste) {
                $_SESSION['artist_id'] = $artiste['id'];
                $_SESSION['artist_name'] = $artiste['nom_scene'];
                sendResponse(true, $artiste, 'Koneksyon reyisi.');
            } else {
                sendResponse(false, null, 'Imèl oswa kòd PIN enkòrèk.', 401);
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
            $audioUrl   = trim($params['audio_url'] ?? '');
            $coverUrl   = trim($params['cover_url'] ?? '');
            $duree      = intval($params['duree'] ?? 180);
            $youtube    = trim($params['youtube_url'] ?? '');
            $tiktok     = trim($params['tiktok_url'] ?? '');
            $instagram  = trim($params['instagram_url'] ?? '');

            if (empty($titre)) {
                sendResponse(false, null, 'Tit mizik la obligatwa.', 400);
            }

            // Jere telechajman fichye odyo si li pase pa FormData
            if (isset($_FILES['audio_file']) && $_FILES['audio_file']['error'] === UPLOAD_ERR_OK) {
                $audioUp = uploadServerFile($_FILES['audio_file'], 'musiques');
                if (!$audioUp['success']) {
                    sendResponse(false, null, $audioUp['message'], 400);
                }
                $audioUrl = $audioUp['url'];
            }

            // Jere telechajman foto kouvèti si genyen
            if (isset($_FILES['cover_file']) && $_FILES['cover_file']['error'] === UPLOAD_ERR_OK) {
                $coverUp = uploadServerFile($_FILES['cover_file'], 'covers');
                if ($coverUp['success']) {
                    $coverUrl = $coverUp['url'];
                }
            }

            if (empty($audioUrl)) {
                sendResponse(false, null, 'Fichye odyo oswa lyen audio_url obligatwa pou pibliye yon mizik.', 400);
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

            $stmt = $db->prepare("
                INSERT INTO musiques (
                    id, titre, artiste_id, nom_artiste, featuring, categorie, 
                    format, nom_album, cover_url, audio_url, duree, 
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

            sendResponse(true, $newMusique, 'Mizik la pibliye avèk siksè sou UpMizik!', 201);
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

            $coverUrl = $params['cover_url'] ?? $existing['cover_url'];
            $audioUrl = $params['audio_url'] ?? $existing['audio_url'];

            if (isset($_FILES['cover_file']) && $_FILES['cover_file']['error'] === UPLOAD_ERR_OK) {
                $upCov = uploadServerFile($_FILES['cover_file'], 'covers');
                if ($upCov['success']) $coverUrl = $upCov['url'];
            }
            if (isset($_FILES['audio_file']) && $_FILES['audio_file']['error'] === UPLOAD_ERR_OK) {
                $upAud = uploadServerFile($_FILES['audio_file'], 'musiques');
                if ($upAud['success']) $audioUrl = $upAud['url'];
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
                'audio_url'     => $audioUrl
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

            sendResponse(true, $updatedM, 'Mizik la mete ajou avèk siksè.');
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
         * [INSERT] Telechaje nenpòt fichye (Odyo, Cover, Avatar, Prèv)
         * POST /api.php?action=upload_file
         */
        case 'upload_file': {
            $folder = $params['folder'] ?? 'musiques'; // musiques, covers, preuves, avatars, bannieres
            if (!isset($_FILES['file'])) {
                sendResponse(false, null, 'Okenn fichye pa voye nan requèt la (chan "file" manke).', 400);
            }

            $res = uploadServerFile($_FILES['file'], $folder);
            if ($res['success']) {
                sendResponse(true, $res, 'Fichye a telechaje avèk siksè sou Hostinger.', 200);
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
