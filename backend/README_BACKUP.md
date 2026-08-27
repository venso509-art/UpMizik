# 🛡️ Gid Backup Otomatik UpMizik sou Hostinger VPS

Sistèm sa a pèmèt ou fè yon kopi sekirite (Backup) otomatik **1 fwa pa jou** sou sèvè VPS Hostinger ou a pou pwoteje tout dosye MP3, foto kouvèti, prèv MonCash, done JSON, ak baz done MySQL.

---

## 📂 Kisa ki nan chak Backup?

1. **Dosye Uploads (`backend/uploads/`)**: Tout fichye odyo MP3 atis yo, imaj kouvèti albòm, prèv transfè MonCash/Natcash, avata, ak banyè.
2. **Done JSON & Paramèt (`src/data/`)**: Tout done JSON, fichye inisyalizasyon, ak konfigirasyon sit la.
3. **Baz Done MySQL**: Tout tablo yo ekspòte an fòma **JSON** (`artists.json`, `musics.json`, `donations.json`, `social_posts.json`, elatriye) ansanm ak yon fichye **SQL dump** konplè.

---

## ⚡ Metòd 1 : Enstalasyon Otomatik Cron Job sou VPS (Rekòmande)

Konekte sou VPS ou a via SSH (egzanp: `ssh root@votre-ip`) epi lanse kòmand sa a:

```bash
cd /path/to/upmizik/backend/scripts
chmod +x cron_setup.sh backup.sh
./cron_setup.sh
```

Sa ap ajoute otomatikman yon travay Crontab ki pral kouri chak swa a **3:00 AM nan maten (03:00)**:
```cron
0 3 * * * /bin/bash /path/to/upmizik/backend/scripts/backup.sh >> /path/to/upmizik/backend/backups/backup.log 2>&1
```

---

## 🌐 Metòd 2 : Konfigirasyon nan Hostinger hPanel > Cron Jobs

Si w ap itilize panèl kontwòl Hostinger hPanel:

1. Ale nan **Hostinger hPanel** > **Advanced** > **Cron Jobs**.
2. Chwazi frekans: **Chak Jou (Daily)** oswa mete `0 3 * * *`.
3. Nan bwat **Command** la, mete:
   ```bash
   /usr/bin/php /home/u123456789/domains/votredomaine.com/public_html/backend/api/backup.php
   ```
4. Klike sou **Save**.

---

## 🔄 Kijan pou fè yon Backup Manyèl Imedyatman

Si w vle lanse yon backup touswit san tann 3:00 AM:

### Opsyon A (Via Terminal VPS):
```bash
/bin/bash /path/to/upmizik/backend/scripts/backup.sh
```

### Opsyon B (Via PHP CLI):
```bash
php /path/to/upmizik/backend/api/backup.php
```

---

## 📥 Kote Backup yo Estoke ak Jesyon Espas Disk

- Tout fichye backup yo estoke nan dosye: `backend/backups/`
- Yo gen fòma: `upmizik_backup_YYYY-MM-DD_HHMMSS.tar.gz` oswa `.zip`.
- **Politik Retansyon**: Script la efase otomatikman tout backup ki gen plis pase **14 jou** pou evite ranpli espas disk VPS ou a.
- **Sekirite**: Dosye `backend/backups/.htaccess` bloke tout aksè dirèk atravè entènèt pou pèsonn pa ka telechaje done w yo san otorizasyon.

---

## ♻️ Kijan pou Restitwe (Restore) yon Backup

Si yon erè ta rive epi ou bezwen retabli done w yo:

1. De-konprese achiv la:
   ```bash
   tar -xzf backend/backups/upmizik_backup_YYYY-MM-DD_HHMMSS.tar.gz -C /tmp/restore/
   ```
2. Ranplase dosye uploads yo:
   ```bash
   cp -r /tmp/restore/*/uploads/* backend/uploads/
   ```
3. Enpòte fichye SQL la nan MySQL si sa nesesè:
   ```bash
   mysql -u upmizik_user -p upmizik_db < /tmp/restore/*/database/database_dump.sql
   ```
