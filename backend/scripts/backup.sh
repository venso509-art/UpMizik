#!/usr/bin/env bash
# ==============================================================================
# UpMizik - Script Otomatik Backup pou Sèvè VPS Hostinger
# ==============================================================================
# Script sa a fèt pou kouri chak jou (via Cron Job) a 3:00 AM sou Hostinger VPS.
# Li fè yon kopi sekirite konplè:
#   1. Tout dosye Uploads (Mizik MP3, Kouvèti, Prèv MonCash, Avata, elatriye)
#   2. Tout dosye JSON / Done ki nan 'src/data' ak 'backend/data'
#   3. Tout baz done MySQL (mysqldump + ekspòtasyon JSON)
#   4. Pwoteje ak efase vye backup ki gen plis pase 14 jou pou konsève espas disk.
# ==============================================================================

set -e

# Jwenn chemen rasin pwojè a kèlkeswa kote script la lanse
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BACKUP_DIR="${PROJECT_ROOT}/backend/backups"
UPLOADS_DIR="${PROJECT_ROOT}/backend/uploads"
SRC_DATA_DIR="${PROJECT_ROOT}/src/data"
DB_CONFIG_FILE="${PROJECT_ROOT}/backend/config/db.php"

DATE_STR=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_NAME="upmizik_backup_${DATE_STR}"
TEMP_DIR="/tmp/${BACKUP_NAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=14

# Kreye dosye backup la si l pa egziste
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

log_msg() {
    local msg="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
    echo "$msg"
    echo "$msg" >> "${LOG_FILE}"
}

log_msg "======================================================"
log_msg "🚀 Kòmansman Backup UpMizik sou VPS Hostinger..."
log_msg "Pwojè Rasin: ${PROJECT_ROOT}"

# ------------------------------------------------------------------------------
# 1. KOPI DOSYE UPLOADS (MP3, KOUVÈTI, PRÈV MONCASH, FOTO)
# ------------------------------------------------------------------------------
if [ -d "${UPLOADS_DIR}" ]; then
    log_msg "📦 Kopi dosye uploads yo..."
    mkdir -p "${TEMP_DIR}/uploads"
    # Kopi tout fichye san kopye dosye tanporè
    cp -r "${UPLOADS_DIR}/"* "${TEMP_DIR}/uploads/" 2>/dev/null || true
    UPLOADS_COUNT=$(find "${TEMP_DIR}/uploads" -type f | wc -l)
    log_msg "✅ Uploads kopye (${UPLOADS_COUNT} fichye jwenn)."
else
    log_msg "⚠️ Dosye uploads pa jwenn nan ${UPLOADS_DIR}."
fi

# ------------------------------------------------------------------------------
# 2. KOPI DONE JSON AK SRC/DATA
# ------------------------------------------------------------------------------
mkdir -p "${TEMP_DIR}/json_data"

if [ -d "${SRC_DATA_DIR}" ]; then
    log_msg "📄 Kopi dosye done JSON / TypeScript ki nan src/data..."
    cp -r "${SRC_DATA_DIR}/"* "${TEMP_DIR}/json_data/" 2>/dev/null || true
fi

# Chèche tout fichye .json nan pwojè a ki pa nan node_modules
find "${PROJECT_ROOT}" -maxdepth 3 -name "*.json" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -exec cp {} "${TEMP_DIR}/json_data/" \; 2>/dev/null || true

JSON_COUNT=$(find "${TEMP_DIR}/json_data" -type f | wc -l)
log_msg "✅ Done JSON kopye (${JSON_COUNT} fichye)."

# ------------------------------------------------------------------------------
# 3. DUMP BAZ DONE MYSQL (SI MYSQLDUMP DISPONIB OUBYEN VIA PHP)
# ------------------------------------------------------------------------------
log_msg "🗄️ Ekspòtasyon baz done MySQL..."
mkdir -p "${TEMP_DIR}/database"

# Eseye itilize PHP backup script la pou jenere JSON & SQL dump dirèk
if command -v php >/dev/null 2>&1 && [ -f "${PROJECT_ROOT}/backend/api/backup.php" ]; then
    log_msg "⚡ Egzekisyon PHP Database Dumper..."
    php "${PROJECT_ROOT}/backend/api/backup.php" --cli-export-only --target-dir="${TEMP_DIR}/database" >> "${LOG_FILE}" 2>&1 || true
fi

# Eseye mysqldump si konfigirasyon an disponib
if command -v mysqldump >/dev/null 2>&1; then
    DB_NAME=$(grep -o "DB_NAME',.*" "${DB_CONFIG_FILE}" 2>/dev/null | cut -d"'" -f3 | tr -d ' ' || echo "")
    DB_USER=$(grep -o "DB_USER',.*" "${DB_CONFIG_FILE}" 2>/dev/null | cut -d"'" -f3 | tr -d ' ' || echo "")
    DB_PASS=$(grep -o "DB_PASS',.*" "${DB_CONFIG_FILE}" 2>/dev/null | cut -d"'" -f3 | tr -d ' ' || echo "")
    DB_HOST=$(grep -o "DB_HOST',.*" "${DB_CONFIG_FILE}" 2>/dev/null | cut -d"'" -f3 | tr -d ' ' || echo "localhost")

    if [ -n "${DB_NAME}" ] && [ -n "${DB_USER}" ] && [ "${DB_NAME}" != "u123456789_upmizik" ]; then
        log_msg "💾 mysqldump ap kouri pou baz done '${DB_NAME}'..."
        mysqldump -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${TEMP_DIR}/database/mysql_dump_${DATE_STR}.sql" 2>/dev/null || true
    fi
fi

# ------------------------------------------------------------------------------
# 4. KONSEPSYON ACHIV FINAL COMPRESSE (.TAR.GZ)
# ------------------------------------------------------------------------------
FINAL_ARCHIVE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
log_msg "🗜️ Konpresyon achiv sekirite a nan ${FINAL_ARCHIVE}..."

tar -czf "${FINAL_ARCHIVE}" -C "/tmp" "${BACKUP_NAME}"

# Netwaye dosye tanporè
rm -rf "${TEMP_DIR}"

# Pwoteje fichye backup la pou sekirite (chmod 600)
chmod 600 "${FINAL_ARCHIVE}"

ARCHIVE_SIZE=$(du -h "${FINAL_ARCHIVE}" | cut -f1)
log_msg "🎉 Backup fini avèk siksè! Gwosè achiv la: ${ARCHIVE_SIZE}"
log_msg "Fichye: ${FINAL_ARCHIVE}"

# ------------------------------------------------------------------------------
# 5. NETWAYE VYE BACKUP KI GEN PLIS PASE 14 JOU (RETENTION POLICY)
# ------------------------------------------------------------------------------
log_msg "🧹 Netwayaj ansyen backup ki gen plis pase ${RETENTION_DAYS} jou..."
OLD_BACKUPS=$(find "${BACKUP_DIR}" -name "upmizik_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -print)

if [ -n "${OLD_BACKUPS}" ]; then
    echo "${OLD_BACKUPS}" | while read -r old_file; do
        rm -f "${old_file}"
        log_msg "🗑️ Efase vye backup: $(basename "${old_file}")"
    done
else
    log_msg "✨ Pa gen vye backup pou efase."
fi

log_msg "🏁 Pwosesis Backup la fini nèt."
log_msg "======================================================"
