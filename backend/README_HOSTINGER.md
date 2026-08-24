# 🚀 Gid Enstalasyon UpMizik sou Hostinger (PHP & MySQL)

Gid sa a eksplike w etap pa etap kijan pou w pibliye sit **UpMizik** la sou **Hostinger** ak backend **PHP & MySQL**, kote tout fichye mizik (.mp3) ak prèv peman yo ap estoke dirèkteman nan dosye sèvè Hostinger a san w pa bezwen Firebase.

---

## 📁 Estrikti Dosye yo sou Hostinger (`public_html`)

Lè w telechaje pwojè a sou Hostinger, estrikti a dwe konsa nan `public_html`:

```text
public_html/
├── index.html               # Frontend React konpile (ki soti nan dosye dist/)
├── assets/                  # CSS ak JS konpile (ki soti nan dosye dist/assets/)
├── favicon.ico
├── .htaccess                # Konfigirasyon Apache pou routage React ak CORS
└── backend/                 # Backend PHP nou kreye a
    ├── .htaccess            # Limit upload 128M ak sekirite
    ├── config/
    │   └── db.php           # Koneksyon MySQL ak Hostinger
    ├── database/
    │   └── schema.sql       # Tablo baz done MySQL yo
    ├── api/                 # Tout endpoints API yo
    │   ├── upload.php       # Resevwa mizik ak prèv pou mete nan dosye Hostinger
    │   ├── auth.php         # Koneksyon atis ak kòd PIN
    │   ├── artists.php      # Enskripsyon ak validasyon atis
    │   ├── musics.php       # Piblikasyon mizik ak lekti odyo
    │   ├── donations.php    # Donasyon ak prèv MonCash/Natcash
    │   ├── inbox.php        # Mesaj ak notifikasyon atis
    │   ├── social.php       # Rezo sosyal atis yo
    │   ├── payouts.php      # Peman atis chak fen mwa
    │   ├── pubs.php         # Piblisite ak banyè
    │   ├── rpa.php          # Révélation du mois
    │   ├── security.php     # Rapò sekirite
    │   └── sync.php         # Senkronizasyon rapid
    └── uploads/             # KOTE FICHYE YO ESTOKE DIRÈKTEMAN
        ├── music/           # Fichye mizik MP3, WAV, M4A
        ├── covers/          # Foto kouvèti mizik ak albòm
        ├── proofs/          # Foto prèv transfè MonCash / Natcash
        ├── avatars/         # Foto pwofil atis yo
        └── banners/         # Banyè pèsonalize atis yo
```

---

## 🛠️ Etap 1: Kreye Baz Done MySQL sou Hostinger

1. Konekte sou kont **Hostinger** ou a epi ouvri **hPanel**.
2. Ale nan seksyon **Databases** > **Management** (oswa *Bases de données MySQL*).
3. Kreye yon nouvo baz done:
   - **MySQL Database Name**: Egz: `u123456789_upmizik`
   - **MySQL Username**: Egz: `u123456789_upmizik_user`
   - **Password**: Mete yon bon modpas sekirize (egz: `UpMizik509@Hostinger2026`)
4. Klike sou **Create**.

---

## 🗄️ Etap 2: Enpòte Tablo yo nan phpMyAdmin

1. Toujou nan hPanel, klike sou bouton **Enter phpMyAdmin** akote baz done ou fenk kreye a.
2. Nan meni anlè a, klike sou **Import** (oswa *Importer*).
3. Klike sou **Choose File** epi chwazi fichye `backend/database/schema.sql`.
4. Klike sou bouton **Go** (oswa *Exécuter*) anba a.
5. Tout 14 tablo yo ap kreye otomatikman avèk tout kolòn ak relasyon yo.

---

## ⚙️ Etap 3: Konfigure Koneksyon an nan `backend/config/db.php`

Ouvri fichye `backend/config/db.php` epi mete vrè enfòmasyon baz done ou te kreye nan Etap 1 an:

```php
define('DB_HOST', 'localhost'); // Sou Hostinger, li toujou 'localhost'
define('DB_NAME', 'u123456789_upmizik'); // Mete non baz done ou a
define('DB_USER', 'u123456789_upmizik_user'); // Mete non itilizatè baz done ou a
define('DB_PASS', 'UpMizik509@Hostinger2026'); // Mete modpas ou a
define('SITE_URL', 'https://domèn-ou-an.com'); // Mete non domèn sit ou a
```

---

## 📂 Etap 4: Bay Dosye `uploads/` Pèmisyon Ekriti (Permissions)

Sou Hostinger **File Manager**:
1. Ale nan `public_html/backend/`.
2. Fè yon klik dwat sou dosye **`uploads`** epi chwazi **Permissions** (oswa *Changer les permissions*).
3. Mete valè a sou **`755`** (oswa **`775`**) epi koche bwat **Update subdirectories** pou tout sou-dosye yo (`music`, `proofs`, `covers`, `avatars`) ka resevwa fichye yo san blokaj.

---

## 🎵 Kijan Telechajman Mizik ak Prèv yo Fonksyone:

Lè yon atis telechaje yon mizik oswa yon prèv:
1. `backend/api/upload.php` resevwa fichye a.
2. Li verifye si se yon fichye odyo (`.mp3`, `.wav`) oswa imaj (`.jpg`, `.png`, `.webp`, `.pdf`).
3. Li anrejistre fichye a dirèkteman nan `public_html/backend/uploads/music/` oswa `public_html/backend/uploads/proofs/`.
4. Li retounen URL dirèk la (egzanp: `https://domèn-ou-an.com/backend/uploads/music/track_123.mp3`).
5. Mizik la ap jwe dirèkteman sou sit la san entèmedyè!

---

## 🚀 Etap 5: Konpile Frontend React la epi Pibliye l

1. Nan òdinatè w, kouri:
   ```bash
   npm run build
   ```
2. Sa ap kreye yon dosye **`dist/`**.
3. Telechaje tout sa ki anndan dosye **`dist/`** la dirèkteman nan **`public_html/`**.
4. Telechaje dosye **`backend/`** la tou nan **`public_html/backend/`**.

Sit UpMizik ou a pare pou l kouri 100% sou Hostinger ak pwòp sèvè ak baz done MySQL ou!
