<?php
/**
 * UpMizik - Modil Otantifikasyon ak Sekirite (auth.php)
 * 
 * Fichye sa a bay fonksyon pou:
 * 1. Kreye hash sekirize pou kòd PIN/modpas atis yo avèk password_hash()
 * 2. Verifye kòd PIN/modpas atis yo avèk password_verify() (ak sipò konpatibilite pou legacy plain text)
 * 3. Mekanis 'Rate Limiting' & pwoteksyon kont Fòs Brit (Brute Force Protection) pou tout koneksyon atis
 * 4. Notifikasyon imèl otomatik bay Administratè lè yo detekte twòp tantativ koneksyon echwe
 * 5. Jenere token sesyon sekirize (JWT/Opaque Token) ak kreyasyon sesyon PHP
 * 6. Verifye token oswa sesyon atis la pou pwoteje aksè nan artist_dashboard
 * 7. Fèmen sesyon (Logout)
 */

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Konfigirasyon Sekirite & Rate Limiting
 */
define('AUTH_SECRET_KEY', getenv('AUTH_SECRET_KEY') ?: 'UpMizik_Secret_Auth_Token_Key_2026_509#@!');
define('AUTH_ALERT_THRESHOLD', 3);              // Kantite tantativ echwe pou deklanche alèt imèl admin (> 3 tantativ)
define('AUTH_MAX_FAILED_ATTEMPTS', 3);          // Kantite tantativ echwe maksimòm anvan blokaj (3 tantativ)
define('AUTH_RATE_LIMIT_WINDOW', 900);          // Fenèt tan kout pou kalkil tantativ yo (15 minit = 900 segond)
define('AUTH_LOCKOUT_DURATION', 900);           // Dire blokaj tanporè kont lan (15 minit = 900 segond)
define('ADMIN_DEFAULT_EMAIL', 'upmizik@gmail.com'); // Imèl notifikasyon sekirite admin pa defo

/**
 * Rekipere epi netwaye adrès IP reyèl kliyan an (ak sipò Cloudflare & Reverse Proxy)
 *
 * @return string Adrès IP pwòp
 */
function getSecurityClientIp(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
        ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
        ?? $_SERVER['HTTP_CLIENT_IP'] 
        ?? $_SERVER['REMOTE_ADDR'] 
        ?? '127.0.0.1';

    if (strpos($ip, ',') !== false) {
        $parts = explode(',', $ip);
        $ip = trim($parts[0]);
    }

    $filteredIp = filter_var($ip, FILTER_VALIDATE_IP);
    return $filteredIp ?: '127.0.0.1';
}

/**
 * Rekipere imèl admin ki dwe resevwa alèt sekirite yo
 *
 * @param PDO|null $db Koneksyon PDO
 * @return string Adrès imèl admin
 */
function getAdminNotificationEmail(?PDO $db = null): string {
    if (!$db) {
        $db = getDB();
    }
    if ($db) {
        try {
            // Chèche nan configurations
            $stmt = $db->prepare("SELECT valeur FROM configurations WHERE cle = 'admin_notification_email' OR cle = 'admin_email' LIMIT 1");
            $stmt->execute();
            $res = $stmt->fetch();
            if (!empty($res['valeur']) && filter_var($res['valeur'], FILTER_VALIDATE_EMAIL)) {
                return trim($res['valeur']);
            }

            // Chèche nan utilisateurs (super_admin)
            $uStmt = $db->query("SELECT email FROM utilisateurs WHERE role = 'super_admin' AND statut = 'actif' ORDER BY date_creation ASC LIMIT 1");
            $adminUser = $uStmt->fetch();
            if (!empty($adminUser['email']) && filter_var($adminUser['email'], FILTER_VALIDATE_EMAIL)) {
                return trim($adminUser['email']);
            }
        } catch (Exception $e) {
            // Ignore failure and fallback
        }
    }
    return getenv('ADMIN_NOTIFICATION_EMAIL') ?: ADMIN_DEFAULT_EMAIL;
}

/**
 * Asire tout tab sekirite ak jounal yo egziste nan baz done MySQL la
 *
 * @param PDO $db
 */
function ensureSecurityTablesExist(PDO $db): void {
    static $tablesCreated = false;
    if ($tablesCreated) return;

    try {
        // Tab: tentatives_connexion (Istorik tantativ koneksyon pou Rate Limiting)
        $db->exec("
            CREATE TABLE IF NOT EXISTS `tentatives_connexion` (
              `id` VARCHAR(64) NOT NULL PRIMARY KEY,
              `identifiant` VARCHAR(255) NOT NULL,
              `email` VARCHAR(255) NOT NULL,
              `ip_adresse` VARCHAR(64) NOT NULL,
              `user_agent` TEXT DEFAULT NULL,
              `succes` TINYINT(1) NOT NULL DEFAULT 0,
              `date_tentative` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              INDEX `idx_tentatives_identifiant` (`identifiant`),
              INDEX `idx_tentatives_email` (`email`),
              INDEX `idx_tentatives_ip` (`ip_adresse`),
              INDEX `idx_tentatives_date` (`date_tentative`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Tab: blocages_securite (Blokaj tanporè akòz Fòs Brit / Rate Limiting)
        $db->exec("
            CREATE TABLE IF NOT EXISTS `blocages_securite` (
              `identifiant` VARCHAR(255) NOT NULL PRIMARY KEY,
              `ip_adresse` VARCHAR(64) DEFAULT NULL,
              `tentatives_echouees` INT NOT NULL DEFAULT 1,
              `bloque_jusqua` DATETIME NOT NULL,
              `alerte_email_envoyee` TINYINT(1) NOT NULL DEFAULT 0,
              `date_creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `date_mise_a_jour` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX `idx_blocages_date` (`bloque_jusqua`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Tab: logs_activite
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

        $tablesCreated = true;
    } catch (Exception $e) {
        error_log("Erè nan kreyasyon tab sekirite: " . $e->getMessage());
    }
}

/**
 * Hash yon kòd PIN oswa modpas avèk algoritm BCRYPT modèn
 *
 * @param string $pin Kòd PIN oswa modpas an klè
 * @return string Hash ki pwoteje
 */
function hashArtistPin(string $pin): string {
    return password_hash($pin, PASSWORD_BCRYPT, ['cost' => 10]);
}

/**
 * Verifye si yon kòd PIN oswa modpas koresponn ak sa ki nan baz done a
 * Sipòte password_verify() epi fè migrasyon otomatik si ansyen kòd la te an tèks klè
 *
 * @param string $inputPin Kòd PIN itilizatè a antre nan fòmilè a
 * @param string $storedHash Valè PIN oswa Hash ki estoke nan baz done a
 * @param string|null $artistId ID atis la si nou vle mete ajou hash la otomatikman
 * @param PDO|null $db Koneksyon PDO opsyonèl
 * @return bool Vrè si PIN nan kòrèk, fo sinon
 */
function verifyArtistPin(string $inputPin, string $storedHash, ?string $artistId = null, ?PDO $db = null): bool {
    if (empty($inputPin) || empty($storedHash)) {
        return false;
    }

    $isValid = false;

    // 1. Tcheke si se yon hash ki te kreye ak password_hash (BCRYPT / ARGON2)
    if (password_verify($inputPin, $storedHash)) {
        $isValid = true;

        // Si algoritm nan bezwen rehash (pa egzanp si cost parameters chanje)
        if ($artistId && $db && password_needs_rehash($storedHash, PASSWORD_BCRYPT, ['cost' => 10])) {
            try {
                $newHash = hashArtistPin($inputPin);
                $stmt = $db->prepare("UPDATE artistes SET pin = ? WHERE id = ?");
                $stmt->execute([$newHash, $artistId]);
            } catch (Exception $e) {
                // Ignore silent failure on rehash update
            }
        }
    } 
    // 2. Konpatibilite Legacy: Si se te yon ansyen PIN tèks klè (pa egzanp "1234")
    elseif (hash_equals((string)$storedHash, (string)$inputPin)) {
        $isValid = true;

        // Migrasyon otomatik: Transfòme PIN tèks klè a vin yon hash sekirize nan baz done a
        if ($artistId && $db) {
            try {
                $secureHash = hashArtistPin($inputPin);
                $stmt = $db->prepare("UPDATE artistes SET pin = ? WHERE id = ?");
                $stmt->execute([$secureHash, $artistId]);
            } catch (Exception $e) {
                // Ignore silent failure
            }
        }
    }

    return $isValid;
}

/**
 * =============================================================================
 * SEKSYON RATE LIMITING & PWOTEKSYON FÒS BRIT (BRUTE FORCE DEFENSE)
 * =============================================================================
 */

/**
 * Verifye si yon atis oswa yon adrès IP anba blokaj 'Rate Limiting' kounye a
 *
 * @param string $identifier Imèl oswa telefòn atis la
 * @param string $ip Adrès IP kliyan an
 * @param PDO|null $db Koneksyon PDO
 * @return array Enfòmasyon sou estati blokaj la
 */
function checkArtistRateLimit(string $identifier, string $ip, ?PDO $db = null): array {
    $cleanId = trim(strtolower($identifier));

    // 1. Verifikasyon nan mòd offline / sesyon
    if (!$db) {
        $sessionKey = 'rate_limit_' . md5($cleanId . '_' . $ip);
        if (isset($_SESSION[$sessionKey])) {
            $lockData = $_SESSION[$sessionKey];
            if ($lockData['locked_until'] > time()) {
                $remainingSec = $lockData['locked_until'] - time();
                $remainingMin = ceil($remainingSec / 60);
                return [
                    'is_blocked' => true,
                    'remaining_seconds' => $remainingSec,
                    'remaining_minutes' => $remainingMin,
                    'failed_attempts' => $lockData['failed_attempts'] ?? AUTH_MAX_FAILED_ATTEMPTS,
                    'message' => "Kont sa a tanporèman bloke akòz twòp tantativ koneksyon ki echwe (Fòs brit detekte). Tanpri ret tann {$remainingMin} minit anvan ou re-eseye, oswa kontakte sipò a."
                ];
            } else {
                // Blokaj la ekspire
                unset($_SESSION[$sessionKey]);
            }
        }
        return [
            'is_blocked' => false,
            'remaining_seconds' => 0,
            'remaining_minutes' => 0,
            'failed_attempts' => 0,
            'remaining_attempts' => AUTH_MAX_FAILED_ATTEMPTS
        ];
    }

    ensureSecurityTablesExist($db);

    try {
        // 2. Tcheke si gen yon blokaj aktif nan tab `blocages_securite`
        $stmt = $db->prepare("
            SELECT * FROM blocages_securite 
            WHERE identifiant = ? OR ip_adresse = ?
            ORDER BY bloque_jusqua DESC 
            LIMIT 1
        ");
        $stmt->execute([$cleanId, $ip]);
        $block = $stmt->fetch();

        if ($block) {
            $lockedUntilTs = strtotime($block['bloque_jusqua']);
            $currentTs = time();

            if ($lockedUntilTs > $currentTs) {
                $remainingSec = $lockedUntilTs - $currentTs;
                $remainingMin = ceil($remainingSec / 60);
                return [
                    'is_blocked' => true,
                    'remaining_seconds' => $remainingSec,
                    'remaining_minutes' => $remainingMin,
                    'failed_attempts' => (int)$block['tentatives_echouees'],
                    'message' => "Kont sa a tanporèman bloke akòz twòp tantativ koneksyon ki echwe (Fòs brit detekte). Tanpri ret tann {$remainingMin} minit anvan ou re-eseye, oswa kontakte sipò a."
                ];
            } else {
                // Blokaj la pase, netwaye ansyen blokaj la
                $delStmt = $db->prepare("DELETE FROM blocages_securite WHERE identifiant = ? OR ip_adresse = ?");
                $delStmt->execute([$cleanId, $ip]);
            }
        }

        // 3. Tcheke kantite tantativ echwe nan fenèt tan an (AUTH_RATE_LIMIT_WINDOW = 15 minit)
        $windowStart = date('Y-m-d H:i:s', time() - AUTH_RATE_LIMIT_WINDOW);
        $countStmt = $db->prepare("
            SELECT COUNT(*) as total_fails 
            FROM tentatives_connexion 
            WHERE (identifiant = ? OR email = ? OR ip_adresse = ?) 
              AND succes = 0 
              AND date_tentative >= ?
        ");
        $countStmt->execute([$cleanId, $cleanId, $ip, $windowStart]);
        $failCountRow = $countStmt->fetch();
        $totalFails = (int)($failCountRow['total_fails'] ?? 0);

        if ($totalFails >= AUTH_MAX_FAILED_ATTEMPTS) {
            $lockUntil = date('Y-m-d H:i:s', time() + AUTH_LOCKOUT_DURATION);
            
            // Kreye oswa mete ajou blokaj la
            $insBlock = $db->prepare("
                INSERT INTO blocages_securite (identifiant, ip_adresse, tentatives_echouees, bloque_jusqua, alerte_email_envoyee, date_creation)
                VALUES (?, ?, ?, ?, 0, NOW())
                ON DUPLICATE KEY UPDATE 
                    tentatives_echouees = VALUES(tentatives_echouees),
                    bloque_jusqua = VALUES(bloque_jusqua)
            ");
            $insBlock->execute([$cleanId, $ip, $totalFails, $lockUntil]);

            $remainingMin = ceil(AUTH_LOCKOUT_DURATION / 60);
            return [
                'is_blocked' => true,
                'remaining_seconds' => AUTH_LOCKOUT_DURATION,
                'remaining_minutes' => $remainingMin,
                'failed_attempts' => $totalFails,
                'message' => "Kont sa a tanporèman bloke akòz twòp tantativ koneksyon ki echwe (Fòs brit detekte). Tanpri ret tann {$remainingMin} minit anvan ou re-eseye, oswa kontakte sipò a."
            ];
        }

        $remainingAttempts = max(0, AUTH_MAX_FAILED_ATTEMPTS - $totalFails);
        return [
            'is_blocked' => false,
            'remaining_seconds' => 0,
            'remaining_minutes' => 0,
            'failed_attempts' => $totalFails,
            'remaining_attempts' => $remainingAttempts
        ];

    } catch (Exception $e) {
        error_log("Erè nan checkArtistRateLimit: " . $e->getMessage());
        return [
            'is_blocked' => false,
            'remaining_seconds' => 0,
            'remaining_minutes' => 0,
            'failed_attempts' => 0,
            'remaining_attempts' => AUTH_MAX_FAILED_ATTEMPTS
        ];
    }
}

/**
 * Anrejistre yon tantativ koneksyon ki echwe, epi deklanche blokaj & notifikasyon imèl admin si limit la depase
 *
 * @param string $identifier Imèl oswa telefòn atis la
 * @param string $ip Adrès IP kliyan an
 * @param string $userAgent Navigatè / Aparèy
 * @param array|null $artistInfo Done atis si li te jwenn nan baz done a
 * @param PDO|null $db Koneksyon PDO
 * @return array Rezilta mizajou tantativ la
 */
function recordFailedArtistLoginAttempt(
    string $identifier,
    string $ip,
    string $userAgent,
    ?array $artistInfo = null,
    ?PDO $db = null
): array {
    $cleanId = trim(strtolower($identifier));
    $logId = 'att_' . time() . '_' . bin2hex(random_bytes(3));

    // 1. Mòd offline / Sesyon Fallback
    if (!$db) {
        $sessionKey = 'rate_limit_' . md5($cleanId . '_' . $ip);
        $currData = $_SESSION[$sessionKey] ?? ['failed_attempts' => 0, 'locked_until' => 0];
        $currData['failed_attempts']++;

        if ($currData['failed_attempts'] >= AUTH_MAX_FAILED_ATTEMPTS) {
            $currData['locked_until'] = time() + AUTH_LOCKOUT_DURATION;
            $_SESSION[$sessionKey] = $currData;

            // Voye notifikasyon imèl bay admin
            sendAdminBruteForceAlertEmail($cleanId, $artistInfo, $currData['failed_attempts'], $ip, $userAgent, ceil(AUTH_LOCKOUT_DURATION / 60), null);

            logActivityEvent(
                'alerte_force_brute',
                $cleanId,
                $artistInfo['id'] ?? null,
                $artistInfo['nom_scene'] ?? null,
                "ALÈT SEKIRITE: Twòp tantativ koneksyon echwe ({$currData['failed_attempts']}) pou menm kont atis la. Kont lan bloke tanporèman pou 15 minit epi yo voye yon imèl bay administratè a.",
                'error',
                null
            );

            return [
                'is_blocked' => true,
                'remaining_attempts' => 0,
                'failed_attempts' => $currData['failed_attempts'],
                'lockout_minutes' => ceil(AUTH_LOCKOUT_DURATION / 60)
            ];
        }

        $_SESSION[$sessionKey] = $currData;
        return [
            'is_blocked' => false,
            'remaining_attempts' => max(0, AUTH_MAX_FAILED_ATTEMPTS - $currData['failed_attempts']),
            'failed_attempts' => $currData['failed_attempts'],
            'lockout_minutes' => 0
        ];
    }

    ensureSecurityTablesExist($db);

    try {
        // 2. Anrejistre tantativ echwe a nan `tentatives_connexion`
        $insStmt = $db->prepare("
            INSERT INTO tentatives_connexion (id, identifiant, email, ip_adresse, user_agent, succes, date_tentative)
            VALUES (?, ?, ?, ?, ?, 0, NOW())
        ");
        $insStmt->execute([$logId, $cleanId, $cleanId, $ip, $userAgent]);

        // 3. Kalkile total echèk nan fenèt 15 minit la
        $windowStart = date('Y-m-d H:i:s', time() - AUTH_RATE_LIMIT_WINDOW);
        $countStmt = $db->prepare("
            SELECT COUNT(*) as total_fails 
            FROM tentatives_connexion 
            WHERE (identifiant = ? OR email = ? OR ip_adresse = ?) 
              AND succes = 0 
              AND date_tentative >= ?
        ");
        $countStmt->execute([$cleanId, $cleanId, $ip, $windowStart]);
        $totalFails = (int)($countStmt->fetch()['total_fails'] ?? 1);

        // 4. Si limit la rive oswa depase (>= 5 echèk)
        if ($totalFails >= AUTH_MAX_FAILED_ATTEMPTS) {
            $lockUntil = date('Y-m-d H:i:s', time() + AUTH_LOCKOUT_DURATION);
            $lockoutMinutes = ceil(AUTH_LOCKOUT_DURATION / 60);

            // Tcheke si nou te deja voye yon imèl alèt pou peryòd blokaj sa a pou pa spame admin
            $checkAlert = $db->prepare("SELECT alerte_email_envoyee FROM blocages_securite WHERE identifiant = ?");
            $checkAlert->execute([$cleanId]);
            $existingBlock = $checkAlert->fetch();
            $alreadyAlerted = $existingBlock ? (bool)$existingBlock['alerte_email_envoyee'] : false;

            // Mete ajou tab blokaj la
            $upBlock = $db->prepare("
                INSERT INTO blocages_securite (identifiant, ip_adresse, tentatives_echouees, bloque_jusqua, alerte_email_envoyee, date_creation)
                VALUES (?, ?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE 
                    tentatives_echouees = VALUES(tentatives_echouees),
                    bloque_jusqua = VALUES(bloque_jusqua),
                    alerte_email_envoyee = 1
            ");
            $upBlock->execute([$cleanId, $ip, $totalFails, $lockUntil]);

            // Voye imèl bay admin si li poko voye
            if (!$alreadyAlerted) {
                sendAdminBruteForceAlertEmail(
                    $cleanId,
                    $artistInfo,
                    $totalFails,
                    $ip,
                    $userAgent,
                    $lockoutMinutes,
                    $db
                );
            }

            // Anrejistre yon jounal alèt sekirite grav nan logs_activite
            logActivityEvent(
                'alerte_force_brute',
                $cleanId,
                $artistInfo['id'] ?? null,
                $artistInfo['nom_scene'] ?? ($artistInfo['nom_complet'] ?? null),
                "ALÈT SEKIRITE (Brute Force): Yo detekte {$totalFails} tantativ koneksyon echwe repete sou kont atis sa a depi IP: {$ip}. Sistèm nan bloke kont lan pou {$lockoutMinutes} minit epi li voye yon notifikasyon imèl imedyat bay Administratè a.",
                'error',
                $db
            );

            return [
                'is_blocked' => true,
                'remaining_attempts' => 0,
                'failed_attempts' => $totalFails,
                'lockout_minutes' => $lockoutMinutes
            ];
        }

        $remainingAttempts = max(0, AUTH_MAX_FAILED_ATTEMPTS - $totalFails);
        return [
            'is_blocked' => false,
            'remaining_attempts' => $remainingAttempts,
            'failed_attempts' => $totalFails,
            'lockout_minutes' => 0
        ];

    } catch (Exception $e) {
        error_log("Erè nan recordFailedArtistLoginAttempt: " . $e->getMessage());
        return [
            'is_blocked' => false,
            'remaining_attempts' => AUTH_MAX_FAILED_ATTEMPTS - 1,
            'failed_attempts' => 1,
            'lockout_minutes' => 0
        ];
    }
}

/**
 * Netwaye tout tantativ echwe ak blokaj pou yon atis apre yon koneksyon reyisi
 *
 * @param string $identifier Imèl oswa telefòn atis la
 * @param string $ip Adrès IP
 * @param PDO|null $db Koneksyon PDO
 */
function clearArtistLoginAttempts(string $identifier, string $ip, ?PDO $db = null): void {
    $cleanId = trim(strtolower($identifier));

    // Mòd offline / Sesyon
    $sessionKey = 'rate_limit_' . md5($cleanId . '_' . $ip);
    if (isset($_SESSION[$sessionKey])) {
        unset($_SESSION[$sessionKey]);
    }

    if (!$db) return;

    try {
        // Efase blokaj aktif
        $delBlock = $db->prepare("DELETE FROM blocages_securite WHERE identifiant = ? OR ip_adresse = ?");
        $delBlock->execute([$cleanId, $ip]);

        // Mete yon makè siksè nan tantativ koneksyon yo
        $logId = 'att_ok_' . time() . '_' . bin2hex(random_bytes(3));
        $insOk = $db->prepare("
            INSERT INTO tentatives_connexion (id, identifiant, email, ip_adresse, user_agent, succes, date_tentative)
            VALUES (?, ?, ?, ?, ?, 1, NOW())
        ");
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown UserAgent';
        $insOk->execute([$logId, $cleanId, $cleanId, $ip, $userAgent]);

        // Netwaye ansyen tantativ echwe ki gen plis pase 24 èdtan pou tab la pa vin twò lou
        $yesterday = date('Y-m-d H:i:s', time() - 86400);
        $cleanOld = $db->prepare("DELETE FROM tentatives_connexion WHERE identifiant = ? AND date_tentative < ?");
        $cleanOld->execute([$cleanId, $yesterday]);

    } catch (Exception $e) {
        error_log("Erè nan clearArtistLoginAttempts: " . $e->getMessage());
    }
}

/**
 * Fonksyon pou voye yon notifikasyon imèl bay administratè a chak fwa sistèm nan
 * detekte plis pase 3 tantativ koneksyon echwe pou menm imèl atis la nan yon espas tan kout (Rate Limiting).
 *
 * @param string $artistEmail Imèl atis ki sibi tantativ echwe yo
 * @param int $failedAttempts Kantite tantativ echwe ki fèt (plis pase 3 tantativ)
 * @param string|null $ip Adrès IP kliyan an / atakè a (opsyonèl)
 * @param string|null $userAgent Aparèy / Navigatè kliyan an (opsyonèl)
 * @param array|null $artistInfo Done atis la si li egziste nan baz done a (opsyonèl)
 * @param int $lockoutMinutes Dire blokaj tanporè a an minit (pa defo 15 minit)
 * @param PDO|null $db Koneksyon PDO opsyonèl
 * @return bool Vrè si notifikasyon an te voye avèk siksè
 */
function notifyAdminOnFailedLoginRateLimit(
    string $artistEmail,
    int $failedAttempts,
    ?string $ip = null,
    ?string $userAgent = null,
    ?array $artistInfo = null,
    int $lockoutMinutes = 15,
    ?PDO $db = null
): bool {
    $clientIp = $ip ?: getSecurityClientIp();
    $clientUa = $userAgent ?: ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown UserAgent');

    // Chèche done atis la si yo pa t bay li
    if (!$artistInfo && $db) {
        try {
            $stmt = $db->prepare("SELECT * FROM artistes WHERE LOWER(email) = LOWER(?) LIMIT 1");
            $stmt->execute([trim($artistEmail)]);
            $artistInfo = $stmt->fetch() ?: null;
        } catch (Exception $e) {
            // Ignore failure
        }
    }

    return sendAdminRateLimitAlertEmail(
        $artistEmail,
        $artistInfo,
        $failedAttempts,
        $clientIp,
        $clientUa,
        $lockoutMinutes,
        $db
    );
}

/**
 * Voye yon notifikasyon imèl sekirite an tan reyèl bay Administratè a lè yo detekte plis pase 3 tantativ koneksyon echwe (Rate Limiting / Fòs Brit)
 *
 * @param string $targetEmail Imèl atis ki sibi tantativ yo
 * @param array|null $artistInfo Enfòmasyon atis la (si li egziste nan baz done a)
 * @param int $attemptCount Kantite tantativ echwe
 * @param string $ip Adrès IP atakè a / kliyan an
 * @param string $userAgent Aparèy / Navigatè
 * @param int $lockoutMinutes Kantite minit kont lan bloke
 * @param PDO|null $db Koneksyon PDO
 * @return bool Vrè si imèl la te voye avèk siksè
 */
function sendAdminRateLimitAlertEmail(
    string $targetEmail,
    ?array $artistInfo,
    int $attemptCount,
    string $ip,
    string $userAgent,
    int $lockoutMinutes,
    ?PDO $db = null
): bool {
    $adminEmail = getAdminNotificationEmail($db);
    $siteName = SITE_NAME;
    $siteUrl = SITE_URL;
    $dateTimeStr = date('d/m/Y à H:i:s') . ' (Heure d\'Haïti / EST)';

    $artistDisplayName = $artistInfo['nom_scene'] ?? ($artistInfo['nom_complet'] ?? 'Atis / Kont ki pa anrejistre');
    $artistId = $artistInfo['id'] ?? 'Non-Defini';
    $artistPhone = $artistInfo['telephone'] ?? 'N/A';
    $artistCity = $artistInfo['ville'] ?? 'N/A';
    $artistStatus = $artistInfo['statut'] ?? 'Inconnu';

    $subject = "🚨 [ALÈT SEKIRITE {$siteName}] Fòs Brit Detekte sou Kont: {$artistDisplayName} ({$targetEmail})";

    // Modèl Imèl HTML Sekirize ak Design Pwofesyonèl UpMizik
    $messageBody = "
    <!DOCTYPE html>
    <html lang='ht'>
    <head>
      <meta charset='UTF-8'>
      <meta name='viewport' content='width=device-width, initial-scale=1.0'>
      <title>{$subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070a; color: #f1f5f9; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .badge-alert { display: inline-block; background: rgba(0, 0, 0, 0.35); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; border: 1px solid rgba(255,255,255,0.2); }
        .content { padding: 24px; }
        .alert-box { background: rgba(220, 38, 38, 0.1); border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 24px; }
        .alert-box p { margin: 0; font-size: 14px; color: #fca5a5; }
        .table-info { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #0b1120; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; }
        .table-info td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #1e293b; }
        .table-info tr:last-child td { border-bottom: none; }
        .label { color: #94a3b8; font-weight: 600; width: 38%; }
        .value { color: #f8fafc; font-weight: 500; word-break: break-all; }
        .highlight { color: #f87171; font-weight: 700; }
        .action-card { background: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
        .action-card h3 { margin-top: 0; font-size: 14px; color: #38bdf8; }
        .action-card ul { margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; }
        .action-card li { margin-bottom: 6px; }
        .btn-container { text-align: center; margin: 30px 0 10px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); }
        .footer { background: #070b14; padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <div class='badge-alert'>🚨 Sistèm Sekirite UpMizik</div>
          <h1>Deteksyon Fòs Brit (Brute Force Alert)</h1>
        </div>
        <div class='content'>
          <div class='alert-box'>
            <p><strong>Atansyon Administratè:</strong> Sistèm sekirite platfòm lan detekte <strong>{$attemptCount} tantativ koneksyon echwe repete</strong> pou menm kont lan. Kont sa a bloke tanporèman pou <strong>{$lockoutMinutes} minit</strong> pa mekanis Rate Limiting la.</p>
          </div>

          <table class='table-info'>
            <tr>
              <td class='label'>Kont Vize (Imèl):</td>
              <td class='value highlight'>{$targetEmail}</td>
            </tr>
            <tr>
              <td class='label'>Non Atis / Sèn:</td>
              <td class='value'><strong>{$artistDisplayName}</strong> (ID: {$artistId})</td>
            </tr>
            <tr>
              <td class='label'>Telefòn & Vil:</td>
              <td class='value'>{$artistPhone} - {$artistCity}</td>
            </tr>
            <tr>
              <td class='label'>Estati Kont lan:</td>
              <td class='value'><span style='text-transform:uppercase; color:#38bdf8;'>{$artistStatus}</span></td>
            </tr>
            <tr>
              <td class='label'>Kantite Tantativ Echwe:</td>
              <td class='value'><strong style='color:#ef4444;'>{$attemptCount} tantativ</strong></td>
            </tr>
            <tr>
              <td class='label'>Adrès IP Kliyan:</td>
              <td class='value' style='font-family:monospace; color:#fbbf24;'>{$ip}</td>
            </tr>
            <tr>
              <td class='label'>Navigatè (User-Agent):</td>
              <td class='value' style='font-size:11px; font-family:monospace;'>{$userAgent}</td>
            </tr>
            <tr>
              <td class='label'>Dat ak Lè:</td>
              <td class='value'>{$dateTimeStr}</td>
            </tr>
            <tr>
              <td class='label'>Mekanism Aplike:</td>
              <td class='value' style='color:#4ade80;'>Rate Limiting Lockout ({$lockoutMinutes} minit)</td>
            </tr>
          </table>

          <div class='action-card'>
            <h3>🛡️ Aksyon Rekòmande pou Administratè a:</h3>
            <ul>
              <li>Konekte nan <strong>Admin Dashboard &gt; Sekirite / Logs</strong> pou wè detay tout tantativ yo.</li>
              <li>Si se atis la li menm ki bliye PIN li, ou ka ede l renouvle kòd PIN li depi pano admin an.</li>
              <li>Si se yon tantativ piratage pa yon adrès IP etranje, ou ka bloke IP a nan pare-feu ou oswa kenbe restriksyon an.</li>
            </ul>
          </div>

          <div class='btn-container'>
            <a href='{$siteUrl}/admin.php' class='btn' target='_blank'>Ouvri Dashboard Admin Sekirite</a>
          </div>
        </div>
        <div class='footer'>
          <p>Mesaj otomatik sa a voye pa Modil Sekirite & Otantifikasyon UpMizik.</p>
          <p>&copy; " . date('Y') . " {$siteName} - Tout dwa rezève. Pwoteksyon Kont & Otantifikasyon Sekirize.</p>
        </div>
      </div>
    </body>
    </html>
    ";

    // An-tèt imèl MIME estanda pou asire bon livrezon
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'From: ' . SITE_NAME . ' Sekirite <security@upmizik.com>';
    $headers[] = 'Reply-To: ' . $adminEmail;
    $headers[] = 'X-Mailer: PHP/' . phpversion();
    $headers[] = 'X-Priority: 1 (Highest)';
    $headers[] = 'X-MSMail-Priority: High';
    $headers[] = 'Importance: High';

    $headersStr = implode("\r\n", $headers);

    // Eseye voye imèl la avèk mail()
    $mailSent = false;
    try {
        $mailSent = @mail($adminEmail, $subject, $messageBody, $headersStr);
    } catch (Exception $e) {
        error_log("Erè pandan voye imèl alèt admin: " . $e->getMessage());
    }

    // Toujou anrejistre yon notifikasyon nan bwat mesaj / messages_inbox si baz done a la
    if ($db) {
        try {
            $inboxId = 'sec_msg_' . time() . '_' . bin2hex(random_bytes(2));
            $adminInboxStmt = $db->prepare("
                INSERT INTO messages_inbox (
                    id, artiste_id, nom_artiste, email_artiste, type, sujet, 
                    nom_expediteur, email_expediteur, email_destinataire, apercu, contenu, est_lu, date_reception
                ) VALUES (
                    ?, 'admin', 'Super Admin', ?, 'alerte_securite', ?,
                    'Sistèm Sekirite UpMizik', 'security@upmizik.com', ?, ?, ?, 0, NOW()
                )
            ");
            $adminInboxStmt->execute([
                $inboxId,
                $adminEmail,
                $subject,
                $adminEmail,
                "🚨 Alèt Fòs Brit: {$attemptCount} tantativ echwe sou kont {$targetEmail} depi IP {$ip}",
                $messageBody
            ]);
        } catch (Exception $e) {
            // Ignore optional inbox table failure
        }
    }

    return $mailSent;
}

/**
 * Alias pou sendAdminRateLimitAlertEmail (Konpatibilite)
 */
function sendAdminBruteForceAlertEmail(
    string $targetEmail,
    ?array $artistInfo,
    int $attemptCount,
    string $ip,
    string $userAgent,
    int $lockoutMinutes,
    ?PDO $db = null
): bool {
    return sendAdminRateLimitAlertEmail(
        $targetEmail,
        $artistInfo,
        $attemptCount,
        $ip,
        $userAgent,
        $lockoutMinutes,
        $db
    );
}

/**
 * =============================================================================
 * SEKSYON TOKEN & SESYON ATIS
 * =============================================================================
 */

/**
 * Jenere yon Token Sesyon sekirize ki gen siyati HMAC-SHA256
 *
 * @param array $artist Done atis la (id, email, nom_scene, statut, elatriye)
 * @param int $expirationSeconds Dire validite token an (default: 7 jou = 604800 segond)
 * @return string Token ankode an Base64URL
 */
function generateArtistToken(array $artist, int $expirationSeconds = 604800): string {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'iss' => SITE_NAME,
        'sub' => $artist['id'],
        'email' => $artist['email'],
        'nom_scene' => $artist['nom_scene'] ?? '',
        'statut' => $artist['statut'] ?? 'actif',
        'iat' => time(),
        'exp' => time() + $expirationSeconds,
        'jti' => bin2hex(random_bytes(16))
    ]);

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, AUTH_SECRET_KEY, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

/**
 * Valide epi dekode yon Token Atis
 *
 * @param string $token Token JWT la
 * @return array|null Done payload la si li valid, null si li pa valid oswa ekspire
 */
function validateArtistToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

    $signature = base64UrlDecode($base64UrlSignature);
    $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, AUTH_SECRET_KEY, true);

    if (!hash_equals($signature, $expectedSignature)) {
        return null; // Siyati a pa kòrèk
    }

    $payload = json_decode(base64UrlDecode($base64UrlPayload), true);
    if (!$payload || !isset($payload['exp']) || !isset($payload['sub'])) {
        return null;
    }

    // Tcheke si token an ekspire
    if ($payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

/**
 * Anrejistre yon jounal aktivite (egz: tantativ koneksyon echwe akòz pending, identifiants enkòrèk, elatriye)
 *
 * @param string $eventType Kalite evènman (echec_connexion_pending, echec_connexion_identifiants, echec_connexion_rate_limit, alerte_force_brute, connexion_reussie)
 * @param string $email Imèl ki te itilize a
 * @param string|null $artistId ID atis la si li egziste
 * @param string|null $artistName Non sèn atis la
 * @param string $reason Eksplikasyon detaye sou rezon evènman an
 * @param string $status warning | error | info | success
 * @param PDO|null $db Koneksyon PDO
 * @return bool
 */
function logActivityEvent(
    string $eventType,
    string $email,
    ?string $artistId = null,
    ?string $artistName = null,
    string $reason = '',
    string $status = 'warning',
    ?PDO $db = null
): bool {
    if (!$db) {
        $db = getDB();
    }

    $ip = getSecurityClientIp();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Client';
    $logId = 'log_' . time() . '_' . bin2hex(random_bytes(4));

    if ($db) {
        try {
            ensureSecurityTablesExist($db);

            $stmt = $db->prepare("
                INSERT INTO `logs_activite` (`id`, `type_evenement`, `email`, `artiste_id`, `nom_scene`, `motif`, `ip_adresse`, `user_agent`, `statut`, `date_creation`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $logId,
                $eventType,
                $email,
                $artistId,
                $artistName,
                $reason,
                $ip,
                $userAgent,
                $status
            ]);
            return true;
        } catch (Exception $e) {
            error_log('Erè anrejistreman log_activite: ' . $e->getMessage());
        }
    }

    return false;
}

/**
 * =============================================================================
 * SEKSYON OTANTIFIKASYON ATIS (AK RATE LIMITING & EMAIL NOTIFICATION)
 * =============================================================================
 */

/**
 * Konekte yon atis avèk Rate Limiting, Pwoteksyon Fòs Brit, Verifikasyon BCRYPT,
 * Notifikasyon Imèl Admin, Token JWT ak Sesyon PHP
 *
 * @param string $email Adrès imèl oswa telefòn atis la
 * @param string $pin Kòd PIN oswa modpas atis la antre
 * @param PDO|null $db Koneksyon PDO
 * @return array Rezilta koneksyon an ak mesaj, token, ak done atis la
 */
function authenticateArtist(string $email, string $pin, ?PDO $db = null): array {
    $email = trim(strtolower($email));
    $pin = trim($pin);
    $ip = getSecurityClientIp();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Client';

    if (empty($email) || empty($pin)) {
        logActivityEvent('echec_connexion_identifiants', $email ?: 'anonim', null, null, 'Tantativ koneksyon ak chan imèl oswa PIN vid.', 'warning', $db);
        return [
            'success' => false,
            'code' => 400,
            'message' => 'Tanpri antre imèl ak kòd PIN ou.'
        ];
    }

    if (!$db) {
        $db = getDB();
    }

    // 1. VERIFIKASYON RATE LIMITING (ÈSKE KONT LAN OUBYEN IP A BLOKE TANPORÈMAN?)
    $rateLimitCheck = checkArtistRateLimit($email, $ip, $db);
    if ($rateLimitCheck['is_blocked']) {
        logActivityEvent(
            'echec_connexion_rate_limit',
            $email,
            null,
            null,
            "Tantativ koneksyon bloke akòz Rate Limiting (Fòs brit). Rete {$rateLimitCheck['remaining_minutes']} minit blokaj.",
            'error',
            $db
        );

        return [
            'success' => false,
            'code' => 429,
            'is_rate_limited' => true,
            'remaining_seconds' => $rateLimitCheck['remaining_seconds'],
            'remaining_minutes' => $rateLimitCheck['remaining_minutes'],
            'message' => $rateLimitCheck['message']
        ];
    }

    // 2. MÒD OFFLINE / DEMO SI BAZ DONE A PA DISPONIB
    if (!$db) {
        if (($email === 'baky@upmizik.com' || $email === 'demo@upmizik.com') && ($pin === '1234' || $pin === '0000')) {
            clearArtistLoginAttempts($email, $ip, null);

            $demoArtist = [
                'id' => 'art_demo_1',
                'nom_scene' => 'Baky Popilè (Demo)',
                'email' => $email,
                'statut' => 'actif'
            ];
            $token = generateArtistToken($demoArtist);
            $_SESSION['artist_id'] = $demoArtist['id'];
            $_SESSION['artist_name'] = $demoArtist['nom_scene'];
            $_SESSION['artist_email'] = $demoArtist['email'];
            $_SESSION['artist_status'] = $demoArtist['statut'];
            $_SESSION['artist_token'] = $token;

            logActivityEvent('connexion_reussie', $email, $demoArtist['id'], $demoArtist['nom_scene'], 'Koneksyon reyisi nan mòd demo offline.', 'success', null);

            return [
                'success' => true,
                'code' => 200,
                'message' => 'Koneksyon reyisi nan mòd demo.',
                'token' => $token,
                'artist' => $demoArtist
            ];
        }

        // Anrejistre echèk nan mòd demo
        $attemptRes = recordFailedArtistLoginAttempt($email, $ip, $userAgent, null, null);
        if ($attemptRes['is_blocked']) {
            return [
                'success' => false,
                'code' => 429,
                'is_rate_limited' => true,
                'message' => "Kont sa a tanporèman bloke pou {$attemptRes['lockout_minutes']} minit akòz twòp tantativ koneksyon echwe. Yo voye yon imèl bay administratè a."
            ];
        }

        logActivityEvent('echec_connexion_identifiants', $email, null, null, 'Imèl oswa PIN enkòrèk nan mòd demo offline.', 'error', null);
        $rem = $attemptRes['remaining_attempts'];
        $warnText = $rem <= 2 ? " (Atansyon: ou rete sèlman {$rem} tantativ anvan kont lan bloke tanporèman)." : "";
        return [
            'success' => false,
            'code' => 401,
            'remaining_attempts' => $rem,
            'message' => "Imèl ou a oubyen kòd ou a pa kòrèk, tanpri verifye.{$warnText}"
        ];
    }

    try {
        // 3. CHÈCHE ATIS LA PA IMÈL OUBYEN TELEFÒN
        $stmt = $db->prepare("SELECT * FROM artistes WHERE LOWER(email) = ? OR telephone = ?");
        $stmt->execute([$email, $email]);
        $artist = $stmt->fetch();

        // Si atis la pa jwenn
        if (!$artist) {
            $attemptRes = recordFailedArtistLoginAttempt($email, $ip, $userAgent, null, $db);
            logActivityEvent('echec_connexion_identifiants', $email, null, null, "Imèl oswa nimewo '{$email}' pa jwenn nan baz done a.", 'error', $db);

            if ($attemptRes['is_blocked']) {
                return [
                    'success' => false,
                    'code' => 429,
                    'is_rate_limited' => true,
                    'message' => "Kont sa a tanporèman bloke pou {$attemptRes['lockout_minutes']} minit akòz twòp tantativ koneksyon echwe (Fòs brit). Yo voye yon imèl bay administratè a."
                ];
            }

            $rem = $attemptRes['remaining_attempts'];
            $warnText = $rem <= 2 ? " (Atansyon: ou rete sèlman {$rem} tantativ anvan kont lan bloke tanporèman)." : "";
            return [
                'success' => false,
                'code' => 401,
                'remaining_attempts' => $rem,
                'message' => "Imèl ou a oubyen kòd ou a pa kòrèk, tanpri verifye.{$warnText}"
            ];
        }

        // 4. TCHEKE ESTATI KONT LAN
        // Ka A: Demann enskripsyon an an atant validasyon toujou
        if ($artist['statut'] === 'en_attente' || $artist['statut'] === 'pending') {
            logActivityEvent('echec_connexion_pending', $email, $artist['id'], $artist['nom_scene'] ?? $artist['nom_complet'], 'Atis la eseye konekte nan artist_dashboard men kont li an atant validasyon $4.99 toujou pa Administratè a.', 'warning', $db);
            return [
                'success' => false,
                'code' => 403,
                'statut' => 'en_attente',
                'message' => 'Demann enskripsyon ou an an atant validasyon toujou pa Administratè a. Tanpri tann li verifye prèv transfè $4.99 la.',
                'artist' => [
                    'id' => $artist['id'],
                    'nom_scene' => $artist['nom_scene'],
                    'email' => $artist['email'],
                    'statut' => $artist['statut']
                ]
            ];
        }

        // Ka B: Kont lan te rejte
        if ($artist['statut'] === 'rejete' || $artist['statut'] === 'rejected') {
            logActivityEvent('echec_connexion_rejete', $email, $artist['id'], $artist['nom_scene'] ?? $artist['nom_complet'], 'Atis la eseye konekte men demann enskripsyon li te rejte pa Administratè a.', 'error', $db);
            return [
                'success' => false,
                'code' => 403,
                'statut' => 'rejete',
                'message' => 'Demann enskripsyon ou an te rejte pa Administratè a. Tanpri kontakte sipò oswa soumèt yon nouvo prèv.',
                'artist' => [
                    'id' => $artist['id'],
                    'nom_scene' => $artist['nom_scene'],
                    'email' => $artist['email'],
                    'statut' => $artist['statut']
                ]
            ];
        }

        // Ka C: Kont lan sispann
        if ($artist['statut'] === 'suspendu' || $artist['statut'] === 'sispann') {
            logActivityEvent('echec_connexion_suspendu', $email, $artist['id'], $artist['nom_scene'] ?? $artist['nom_complet'], 'Atis la eseye konekte men kont li tanporèman sispann pa Administratè a.', 'error', $db);
            return [
                'success' => false,
                'code' => 403,
                'statut' => 'suspendu',
                'message' => 'Kont atis ou a tanporèman sispann pa Administratè a.',
                'artist' => [
                    'id' => $artist['id'],
                    'nom_scene' => $artist['nom_scene'],
                    'email' => $artist['email'],
                    'statut' => $artist['statut']
                ]
            ];
        }

        // 5. VERIFYE KÒD PIN / MODPAS LA AVÈK PASSWORD_VERIFY
        $isPinValid = verifyArtistPin($pin, $artist['pin'], $artist['id'], $db);

        if (!$isPinValid) {
            // Anrejistre tantativ echwe a pou kont sa a
            $attemptRes = recordFailedArtistLoginAttempt($email, $ip, $userAgent, $artist, $db);
            logActivityEvent('echec_connexion_identifiants', $email, $artist['id'], $artist['nom_scene'] ?? $artist['nom_complet'], "Kòd PIN enkòrèk pou atis la ({$artist['nom_scene']}).", 'error', $db);

            if ($attemptRes['is_blocked']) {
                return [
                    'success' => false,
                    'code' => 429,
                    'is_rate_limited' => true,
                    'message' => "Kont sa a tanporèman bloke pou {$attemptRes['lockout_minutes']} minit akòz twòp tantativ koneksyon echwe (Fòs brit). Yo voye yon imèl alèt bay administratè a."
                ];
            }

            $rem = $attemptRes['remaining_attempts'];
            $warnText = $rem <= 2 ? " (Atansyon: ou rete sèlman {$rem} tantativ anvan kont lan bloke tanporèman pou sekirite)." : "";
            return [
                'success' => false,
                'code' => 401,
                'remaining_attempts' => $rem,
                'message' => "Imèl ou a oubyen kòd PIN ou a pa kòrèk, tanpri verifye.{$warnText}"
            ];
        }

        // 6. KONEKSYON REYISI! NETWAYE TANTATIV ECHWE YO & KREYE SESYON/TOKEN
        clearArtistLoginAttempts($email, $ip, $db);

        unset($artist['pin']); // Pa janm retounen PIN/Hash nan repons lan

        $token = generateArtistToken($artist);

        $_SESSION['artist_id'] = $artist['id'];
        $_SESSION['artist_name'] = $artist['nom_scene'];
        $_SESSION['artist_email'] = $artist['email'];
        $_SESSION['artist_status'] = $artist['statut'];
        $_SESSION['artist_token'] = $token;

        logActivityEvent('connexion_reussie', $email, $artist['id'], $artist['nom_scene'] ?? $artist['nom_complet'], 'Koneksyon reyisi avèk siksè nan artist_dashboard.', 'success', $db);

        return [
            'success' => true,
            'code' => 200,
            'message' => 'Koneksyon reyisi. Byenvini nan Espas Atis ou.',
            'token' => $token,
            'artist' => $artist
        ];

    } catch (Exception $e) {
        logActivityEvent('echec_serveur', $email, null, null, 'Erè sèvè pandan otantifikasyon: ' . $e->getMessage(), 'error', $db);
        return [
            'success' => false,
            'code' => 500,
            'message' => 'Erè sèvè pandan otantifikasyon: ' . $e->getMessage()
        ];
    }
}

/**
 * Verifye si itilizatè aktyèl la gen dwa aksede artist_dashboard
 * Tcheke swa nan Sesyon PHP swa nan Header Authorization (Bearer Token)
 *
 * @param PDO|null $db Koneksyon PDO
 * @return array|null Done atis la si li gen aksè, null sinon
 */
function requireArtistAuth(?PDO $db = null): ?array {
    // 1. Tcheke Header Authorization (Bearer <token>)
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = validateArtistToken($token);

        if ($payload && isset($payload['sub'])) {
            if (!$db) $db = getDB();
            if ($db) {
                $stmt = $db->prepare("SELECT id, nom_scene, nom_complet, email, telephone, ville, avatar_url, bio, statut, total_ecoutes, total_dons_recus FROM artistes WHERE id = ?");
                $stmt->execute([$payload['sub']]);
                $artist = $stmt->fetch();
                if ($artist && ($artist['statut'] === 'actif' || $artist['statut'] === 'active')) {
                    return $artist;
                }
            } else {
                if (($payload['statut'] ?? '') === 'actif' || ($payload['statut'] ?? '') === 'active') {
                    return $payload;
                }
            }
        }
    }

    // 2. Tcheke Sesyon PHP
    if (!empty($_SESSION['artist_id'])) {
        $artistId = $_SESSION['artist_id'];
        if (!$db) $db = getDB();

        if ($db) {
            $stmt = $db->prepare("SELECT id, nom_scene, nom_complet, email, telephone, ville, avatar_url, bio, statut, total_ecoutes, total_dons_recus FROM artistes WHERE id = ?");
            $stmt->execute([$artistId]);
            $artist = $stmt->fetch();
            if ($artist && ($artist['statut'] === 'actif' || $artist['statut'] === 'active')) {
                return $artist;
            }
        } else {
            return [
                'id' => $_SESSION['artist_id'],
                'nom_scene' => $_SESSION['artist_name'] ?? 'Atis',
                'email' => $_SESSION['artist_email'] ?? '',
                'statut' => $_SESSION['artist_status'] ?? 'actif'
            ];
        }
    }

    return null;
}

/**
 * Fèmen sesyon atis la (Logout)
 */
function logoutArtist(): void {
    unset($_SESSION['artist_id']);
    unset($_SESSION['artist_name']);
    unset($_SESSION['artist_email']);
    unset($_SESSION['artist_status']);
    unset($_SESSION['artist_token']);
}

// -----------------------------------------------------------------------------
// Fonksyon èd pou Base64URL Encoding/Decoding
// -----------------------------------------------------------------------------

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}
