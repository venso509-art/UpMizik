<?php
/**
 * UpMizik - Direct File Upload Handler (Hostinger Server Storage)
 * 
 * Fichye sa a resevwa mizik (.mp3, .wav), kouvèti (.jpg, .png), prèv transfè MonCash/Natcash,
 * epi estoke yo dirèkteman nan dosye /uploads/ sou sèvè Hostinger a.
 */

require_once __DIR__ . '/../config/db.php';

// Mete limit memwa ak tan ekzekisyon pou gwo fichye mizik
ini_set('upload_max_filesize', '128M');
ini_set('post_max_size', '128M');
ini_set('max_execution_time', '300');
ini_set('memory_limit', '256M');

// Dosye prensipal kote fichye yo ap estoke sou Hostinger
$baseUploadDir = dirname(__DIR__) . '/uploads';

// Asire tout sou-dosye yo egziste ak pèmisyon kòrèk
$folders = ['music', 'covers', 'proofs', 'avatars', 'banners', 'media'];
foreach ($folders as $folder) {
    $dirPath = $baseUploadDir . '/' . $folder;
    if (!file_exists($dirPath)) {
        @mkdir($dirPath, 0755, true);
    }
}

// 1. Tcheke si se yon POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Sèlman metòd POST ki aksepte.'], 405);
}

// Rekipere kategori upload la (music, covers, proofs, avatars, banners)
$type = $_POST['type'] ?? $_GET['type'] ?? 'general';
$targetSubfolder = 'general';
if (in_array($type, ['music', 'covers', 'proofs', 'avatars', 'banners', 'media'])) {
    $targetSubfolder = $type;
}

$targetDir = $baseUploadDir . '/' . $targetSubfolder;
if (!file_exists($targetDir)) {
    @mkdir($targetDir, 0755, true);
}

// A. Tretman pou Fichye Voye via multipart/form-data ($_FILES)
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file'];
    $originalName = $file['name'];
    $tmpPath = $file['tmp_name'];
    $fileSize = $file['size'];
    
    // Detèmine ekstansyon fichye a
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    
    // Valide ekstansyon yo selon tip fichye a
    $allowedMusic = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];
    $allowedImages = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    $allowedProofs = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    
    $isAllowed = false;
    if ($targetSubfolder === 'music' && in_array($extension, $allowedMusic)) {
        $isAllowed = true;
    } elseif (in_array($targetSubfolder, ['covers', 'avatars', 'banners']) && in_array($extension, $allowedImages)) {
        $isAllowed = true;
    } elseif ($targetSubfolder === 'proofs' && in_array($extension, $allowedProofs)) {
        $isAllowed = true;
    } elseif (in_array($extension, array_merge($allowedMusic, $allowedImages, $allowedProofs))) {
        $isAllowed = true;
    }

    if (!$isAllowed) {
        jsonResponse([
            'success' => false,
            'message' => 'Fòma fichye sa a pa otorize (' . htmlspecialchars($extension) . ').'
        ], 400);
    }

    // Netwaye non fichye a epi kreye yon non inik pou evite konfli
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $safeName = substr($safeName, 0, 40);
    $uniqueFileName = $targetSubfolder . '_' . time() . '_' . bin2hex(random_bytes(4)) . '_' . $safeName . '.' . $extension;
    $destination = $targetDir . '/' . $uniqueFileName;

    if (move_uploaded_file($tmpPath, $destination)) {
        // Kreye chemen URL relatif ak absoli pou fichye a
        $relativePath = '/backend/uploads/' . $targetSubfolder . '/' . $uniqueFileName;
        $fullUrl = rtrim(SITE_URL, '/') . $relativePath;

        jsonResponse([
            'success' => true,
            'message' => 'Fichye a telechaje avèk siksè sou sèvè Hostinger a.',
            'url' => $fullUrl,
            'relativePath' => $relativePath,
            'fileName' => $uniqueFileName,
            'originalName' => $originalName,
            'size' => $fileSize,
            'type' => $targetSubfolder
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Enposib pou anrejistre fichye a sou sèvè a.'], 500);
    }
}

// B. Tretman pou Fichye Base64 (Data URI) voye nan JSON
$input = getJsonInput();
if (!empty($input['base64Data'])) {
    $base64Data = $input['base64Data'];
    $customType = $input['type'] ?? $targetSubfolder;
    if (in_array($customType, $folders)) {
        $targetSubfolder = $customType;
        $targetDir = $baseUploadDir . '/' . $targetSubfolder;
    }

    // Ekstrè tip MIME ak done binaire yo
    if (preg_match('/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);base64,(.+)$/', $base64Data, $matches)) {
        $mimeType = $matches[1];
        $decodedData = base64_decode($matches[2]);
        
        $mimeToExt = [
            'audio/mpeg' => 'mp3',
            'audio/mp3' => 'mp3',
            'audio/wav' => 'wav',
            'audio/x-wav' => 'wav',
            'audio/aac' => 'aac',
            'audio/mp4' => 'm4a',
            'audio/ogg' => 'ogg',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'application/pdf' => 'pdf'
        ];
        
        $extension = $mimeToExt[$mimeType] ?? 'bin';
        $uniqueFileName = $targetSubfolder . '_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
        $destination = $targetDir . '/' . $uniqueFileName;

        if (file_put_contents($destination, $decodedData) !== false) {
            $relativePath = '/backend/uploads/' . $targetSubfolder . '/' . $uniqueFileName;
            $fullUrl = rtrim(SITE_URL, '/') . $relativePath;

            jsonResponse([
                'success' => true,
                'message' => 'Fichye Base64 la estoke sou sèvè Hostinger a.',
                'url' => $fullUrl,
                'relativePath' => $relativePath,
                'fileName' => $uniqueFileName,
                'type' => $targetSubfolder
            ]);
        }
    }
}

jsonResponse([
    'success' => false, 
    'message' => 'Pa gen okenn fichye ki te voye. Asire w chwazi yon fichye valid.'
], 400);
