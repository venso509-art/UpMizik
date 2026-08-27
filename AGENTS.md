# Pwojè & Enfòmasyon Enpòtan sou Deplwaman (Devops / Hostinger)

## Achitekti & Deplwaman
- **Sèvè / Enfrastrikti**: VPS Hostinger k ap kouri sou **Ubuntu 22.04 LTS**.
- **Panèl Jesyon**: **aaPanel** sou Ubuntu.
- **Workflow Senkronizasyon**:
  1. Kod la devlope epi ajiste sou **Google AI Studio**.
  2. AI Studio senkronize dirèkteman ak repozitwa **GitHub** pwojè a.
  3. Sèvè VPS Hostinger a (aaPanel) rale (pull) mizajou yo soti sou GitHub gras ak kòmand terminal Ubuntu 22.04 pou mete sit la an liy.

## Enstriksyon pou Asistan an
- Toujou kenbe nan tèt ou achitekti sa a (Hostinger VPS + Ubuntu 22.04 + aaPanel + GitHub Sync).
- Tout rekòmandasyon deplwaman, konfigirasyon sèvè (Nginx, PM2, Node.js, anviwònman `.env`, Webhooks, oswa kòmand terminal) dwe konpatib ak anviwònman **aaPanel / Ubuntu 22.04** sou VPS Hostinger.
