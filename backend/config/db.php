<?php
/**
 * UpMizik - Database Connection Configuration (Hostinger / MySQL)
 * 
 * Konfigirasyon baz done MySQL pou Hostinger (hPanel / cPanel)
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Konfigirasyon Koneksyon MySQL sou Hostinger
// Ranplase enfòmasyon sa yo ak sa ou kreye nan Hostinger hPanel > Databases
define('DB_HOST', getenv('DB_HOST') ?: 'localhost'); // Sou Hostinger, li toujou 'localhost'
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_upmizik'); // Non baz done ou a (egz: u123456789_upmizik)
define('DB_USER', getenv('DB_USER') ?: 'u123456789_upmizik_user'); // Non itilizatè baz done a
define('DB_PASS', getenv('DB_PASS') ?: 'VotreMotDePasseSekirize509@'); // Modpas ou te mete nan Hostinger

// Base URL pou telechajman dosye yo sou Hostinger
// Egzanp: 'https://upmizik.com' oswa 'https://votredomaine.com'
define('SITE_URL', getenv('SITE_URL') ?: ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . ($_SERVER['HTTP_HOST'] ?? 'localhost')));

function getDBConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erè koneksyon ak baz done MySQL: ' . $e->getMessage()
        ]);
        exit();
    }
}

// Fonksyon jeneral pou voye repons JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// Fonksyon pou rekipere done JSON voye nan kò demand lan (POST / PUT)
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
