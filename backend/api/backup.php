<?php
/**
 * UpMizik - Hostinger VPS Automated Backup Engine (PHP + MySQL + Uploads + JSON)
 * 
 * Script sa a ka kouri:
 * 1. Nan CLI (Cron Job chak jou): `php /path/to/backend/api/backup.php`
 * 2. Atravè script bash la: `bash /path/to/backend/scripts/backup.sh`
 * 3. Atravè API Admin pou fè backup manyèl oswa telechaje achiv.
 */

// Si se CLI
$isCli = (php_sapi_name() === 'cli' || defined('STDIN'));

if (!$isCli) {
    require_once __DIR__ . '/../config/db.php';
} else {
    // Nan CLI, kòmanse san header HTTP
    @include_once __DIR__ . '/../config/db.php';
}

$backupsDir = __DIR__ . '/../backups';
$uploadsDir = __DIR__ . '/../uploads';
$srcDataDir = __DIR__ . '/../../src/data';
$projectRoot = dirname(dirname(__DIR__));

if (!file_exists($backupsDir)) {
    @mkdir($backupsDir, 0750, true);
}

// ------------------------------------------------------------------------------
// Fonksyon pou jwenn tout done MySQL yo sou fòma JSON
// ------------------------------------------------------------------------------
function exportDatabaseToJsonAndSql($targetDir) {
    if (!file_exists($targetDir)) {
        @mkdir($targetDir, 0755, true);
    }

    $exportedFiles = [];
    $pdo = null;

    try {
        if (function_exists('getDBConnection')) {
            $pdo = getDBConnection();
        }
    } catch (Exception $e) {
        $pdo = null;
    }

    if (!$pdo) {
        // Kreye yon fichye enfòmasyon si baz done a pa disponib
        file_put_contents($targetDir . '/db_status.txt', "Baz done MySQL pa t konekte pandan dump sa a.\nDat: " . date('Y-m-d H:i:s'));
        return ['db_status.txt'];
    }

    $tables = [
        'artists',
        'musics',
        'donations',
        'social_posts',
        'social_comments',
        'pubs',
        'rpa_items',
        'artist_inbox',
        'security_logs',
        'payout_archives'
    ];

    $sqlDump = "-- UpMizik Hostinger Database Dump\n-- Dat: " . date('Y-m-d H:i:s') . "\n\n";

    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT * FROM `{$table}`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Ekri fichye JSON pou chak tablo
            $jsonFilePath = $targetDir . "/{$table}.json";
            file_put_contents($jsonFilePath, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $exportedFiles[] = "{$table}.json";

            // Ajoute nan SQL Dump la
            if (!empty($rows)) {
                $sqlDump .= "-- Tablo: `{$table}`\n";
                foreach ($rows as $row) {
                    $keys = array_map(function($k) { return "`" . addslashes($k) . "`"; }, array_keys($row));
                    $values = array_map(function($v) use ($pdo) {
                        if ($v === null) return "NULL";
                        return $pdo->quote($v);
                    }, array_values($row));
                    $sqlDump .= "INSERT INTO `{$table}` (" . implode(", ", $keys) . ") VALUES (" . implode(", ", $values) . ");\n";
                }
                $sqlDump .= "\n";
            }
        } catch (Exception $e) {
            // Tablo a ka pa egziste ankò
            continue;
        }
    }

    $sqlFilePath = $targetDir . "/database_dump.sql";
    file_put_contents($sqlFilePath, $sqlDump);
    $exportedFiles[] = "database_dump.sql";

    return $exportedFiles;
}

// ------------------------------------------------------------------------------
// Fonksyon pou kreye yon Achiv ZIP konplè (Uploads + JSON + DB)
// ------------------------------------------------------------------------------
function createCompleteBackupZip($backupsDir, $uploadsDir, $srcDataDir, $projectRoot) {
    if (!class_exists('ZipArchive')) {
        return ['success' => false, 'message' => 'Klas ZipArchive pa enstale nan PHP sou VPS la.'];
    }

    $dateStr = date('Y-m-d_His');
    $zipFileName = "upmizik_backup_{$dateStr}.zip";
    $zipFilePath = $backupsDir . '/' . $zipFileName;

    $zip = new ZipArchive();
    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        return ['success' => false, 'message' => 'Enposib kreye fichye ZIP la nan: ' . $zipFilePath];
    }

    // 1. Ekspòte baz done nan yon dosye tanporè epi mete l nan ZIP la
    $tempDbDir = sys_get_temp_dir() . '/upmizik_db_dump_' . time();
    $dbFiles = exportDatabaseToJsonAndSql($tempDbDir);
    foreach ($dbFiles as $file) {
        $fullPath = $tempDbDir . '/' . $file;
        if (file_exists($fullPath)) {
            $zip->addFile($fullPath, 'database/' . $file);
        }
    }

    // 2. Kopi dosye uploads yo
    if (file_exists($uploadsDir) && is_dir($uploadsDir)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploadsDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($files as $file) {
            $filePath = $file->getRealPath();
            $relativePath = 'uploads/' . substr($filePath, strlen($uploadsDir) + 1);
            if ($file->isDir()) {
                $zip->addEmptyDir($relativePath);
            } else if ($file->isFile()) {
                $zip->addFile($filePath, $relativePath);
            }
        }
    }

    // 3. Kopi fichye src/data ak done JSON
    if (file_exists($srcDataDir) && is_dir($srcDataDir)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($srcDataDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($files as $file) {
            $filePath = $file->getRealPath();
            $relativePath = 'src_data/' . substr($filePath, strlen($srcDataDir) + 1);
            if ($file->isDir()) {
                $zip->addEmptyDir($relativePath);
            } else if ($file->isFile()) {
                $zip->addFile($filePath, $relativePath);
            }
        }
    }

    // 4. Mete yon fichye manifest
    $manifest = [
        'platform' => 'UpMizik Hostinger VPS',
        'backup_date' => date('c'),
        'timestamp' => time(),
        'included_sections' => [
            'uploads' => true,
            'database_json' => true,
            'database_sql' => true,
            'src_data' => true
        ]
    ];
    $zip->addFromString('backup_manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));

    $zip->close();

    // Netwaye dosye tanporè
    foreach ($dbFiles as $file) {
        @unlink($tempDbDir . '/' . $file);
    }
    @rmdir($tempDbDir);

    // Netwaye ansyen backup (kenbe 14 dènye jou yo)
    cleanOldBackups($backupsDir, 14);

    return [
        'success' => true,
        'fileName' => $zipFileName,
        'filePath' => $zipFilePath,
        'fileSize' => file_exists($zipFilePath) ? filesize($zipFilePath) : 0,
        'date' => date('Y-m-d H:i:s')
    ];
}

// ------------------------------------------------------------------------------
// Netwayaj vye backup
// ------------------------------------------------------------------------------
function cleanOldBackups($backupsDir, $daysToKeep = 14) {
    if (!is_dir($backupsDir)) return;
    $files = scandir($backupsDir);
    $now = time();
    $cutoff = $now - ($daysToKeep * 86400);

    foreach ($files as $file) {
        if ($file === '.' || $file === '..' || $file === '.htaccess' || $file === 'backup.log') continue;
        $fullPath = $backupsDir . '/' . $file;
        if (is_file($fullPath) && (strpos($file, 'upmizik_backup_') === 0)) {
            if (filemtime($fullPath) < $cutoff) {
                @unlink($fullPath);
            }
        }
    }
}

// ==============================================================================
// KÒMAND CLI (CRON JOB OUBYEN BASH SCRIPT)
// ==============================================================================
if ($isCli) {
    global $argv;
    $args = $argv ?? [];

    // Tcheke si se sèlman ekspòtasyon done pou script bash la
    $isExportOnly = false;
    $targetDir = '';

    foreach ($args as $arg) {
        if ($arg === '--cli-export-only') {
            $isExportOnly = true;
        }
        if (strpos($arg, '--target-dir=') === 0) {
            $targetDir = substr($arg, strlen('--target-dir='));
        }
    }

    if ($isExportOnly && !empty($targetDir)) {
        echo "Ekspòtasyon baz done MySQL nan {$targetDir}...\n";
        $files = exportDatabaseToJsonAndSql($targetDir);
        echo "Fichye ekspòte: " . implode(', ', $files) . "\n";
        exit(0);
    }

    echo "======================================================\n";
    echo "🚀 UpMizik - Kòmansman Backup Otomatik Hostinger VPS\n";
    echo "Dat: " . date('Y-m-d H:i:s') . "\n";

    $res = createCompleteBackupZip($backupsDir, $uploadsDir, $srcDataDir, $projectRoot);

    if ($res['success']) {
        echo "✅ Backup kreye avèk siksè!\n";
        echo "Fichye: {$res['fileName']}\n";
        echo "Gwosè: " . round($res['fileSize'] / (1024 * 1024), 2) . " MB\n";
        echo "Chemen: {$res['filePath']}\n";
    } else {
        echo "❌ Erè pandan backup la: {$res['message']}\n";
        exit(1);
    }

    echo "======================================================\n";
    exit(0);
}

// ==============================================================================
// KÒTÈ HTTP WEB API (POU ADMIN DASHBOARD)
// ==============================================================================
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'list';

if ($method === 'GET') {
    if ($action === 'list') {
        $backupFiles = [];
        if (is_dir($backupsDir)) {
            $files = scandir($backupsDir);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..' || $file === '.htaccess' || $file === 'backup.log') continue;
                $fullPath = $backupsDir . '/' . $file;
                if (is_file($fullPath) && (strpos($file, 'upmizik_backup_') === 0)) {
                    $backupFiles[] = [
                        'fileName' => $file,
                        'size' => filesize($fullPath),
                        'formattedSize' => round(filesize($fullPath) / (1024 * 1024), 2) . ' MB',
                        'timestamp' => filemtime($fullPath),
                        'date' => date('Y-m-d H:i:s', filemtime($fullPath))
                    ];
                }
            }
        }
        // Triye pa dat ki pi resan
        usort($backupFiles, function($a, $b) {
            return $b['timestamp'] - $a['timestamp'];
        });

        jsonResponse([
            'success' => true,
            'backups' => $backupFiles,
            'total' => count($backupFiles),
            'cronStatus' => 'Konfigire pou kouri 1 fwa pa jou a 3:00 AM'
        ]);
    }

    if ($action === 'download') {
        $fileName = basename($_GET['file'] ?? '');
        $filePath = $backupsDir . '/' . $fileName;

        if (empty($fileName) || !file_exists($filePath) || strpos($fileName, 'upmizik_backup_') !== 0) {
            jsonResponse(['success' => false, 'message' => 'Fichye backup la pa jwenn oswa pa valab.'], 404);
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }
}

if ($method === 'POST') {
    if ($action === 'create') {
        $res = createCompleteBackupZip($backupsDir, $uploadsDir, $srcDataDir, $projectRoot);
        if ($res['success']) {
            jsonResponse([
                'success' => true,
                'message' => 'Nouvo backup fèt avèk siksè sou Hostinger VPS.',
                'backup' => $res
            ]);
        } else {
            jsonResponse([
                'success' => false,
                'message' => $res['message']
            ], 500);
        }
    }
}
