#!/usr/bin/env bash
# ==============================================================================
# UpMizik - Enstalatè Otomatik Cron Job sou Hostinger VPS
# ==============================================================================
# Script sa a konfigire Crontab sou sèvè VPS ou a pou backup la kouri
# otomatikman chak jou a 3:00 AM nan maten san ou pa bezwen fè anyen.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_SCRIPT="${PROJECT_ROOT}/backend/scripts/backup.sh"
LOG_FILE="${PROJECT_ROOT}/backend/backups/backup.log"

echo "======================================================"
echo "🚀 Konfigirasyon Cron Job pou Backup UpMizik sou VPS..."
echo "Pwojè: ${PROJECT_ROOT}"
echo "Script Backup: ${BACKUP_SCRIPT}"

# Asire script backup la gen pèmisyon egzekisyon (chmod +x)
chmod +x "${BACKUP_SCRIPT}"
mkdir -p "${PROJECT_ROOT}/backend/backups"

# Liy cron pou kouri a 3:00 AM chak jou
CRON_JOB="0 3 * * * /bin/bash ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"

# Tcheke si cron job la deja egziste
EXISTING_CRON=$(crontab -l 2>/dev/null || true)

if echo "${EXISTING_CRON}" | grep -Fq "${BACKUP_SCRIPT}"; then
    echo "ℹ️ Cron Job la te deja enstale sou sèvè VPS la."
else
    # Ajoute nouvo travay la nan crontab
    (echo "${EXISTING_CRON}"; echo "# UpMizik Backup chak jou a 3:00 AM"; echo "${CRON_JOB}") | crontab -
    echo "✅ Cron Job la enstale avèk siksè nan Crontab sèvè a!"
fi

echo ""
echo "📅 Orè: Chak jou a 3:00 AM nan maten (03:00)"
echo "📁 Kopi: backend/uploads, src/data, tablo MySQL nan fòma JSON ak SQL"
echo "📄 Jounal Log: ${LOG_FILE}"
echo "======================================================"
