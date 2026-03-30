# Guide de mise en production — ArtHub

Ce guide décrit le déploiement complet du projet ArtHub (API Symfony + Frontend Angular) sur un **VPS OVH** avec Ubuntu, Nginx, PostgreSQL et Let's Encrypt.

---

## Sommaire

1. [Choix du serveur](#1-choix-du-serveur)
2. [Configuration initiale du VPS](#2-configuration-initiale-du-vps)
3. [Installation des dépendances](#3-installation-des-dépendances)
4. [PostgreSQL](#4-postgresql)
5. [Déploiement du backend (Symfony)](#5-déploiement-du-backend-symfony)
6. [Déploiement du frontend (Angular)](#6-déploiement-du-frontend-angular)
7. [Configuration Nginx](#7-configuration-nginx)
8. [HTTPS avec Let's Encrypt](#8-https-avec-lets-encrypt)
9. [Emails en production](#9-emails-en-production)
10. [Mises à jour et déploiement continu](#10-mises-à-jour-et-déploiement-continu)
11. [Maintenance et monitoring](#11-maintenance-et-monitoring)
12. [Checklist finale](#12-checklist-finale)

---

## 1. Choix du serveur

### VPS OVH recommandé

| Offre | CPU | RAM | Stockage | Prix (~) |
|-------|-----|-----|----------|----------|
| **VPS Starter** (dev/test) | 1 vCore | 2 Go | 20 Go SSD | ~4 €/mois |
| **VPS Essential** (production) | 2 vCores | 4 Go | 40 Go SSD | ~8 €/mois |

**Recommandation** : VPS Essential pour la production (suffisant pour ArtHub).

### Commander le VPS

1. Aller sur [ovhcloud.com/fr/vps](https://www.ovhcloud.com/fr/vps/)
2. Choisir **VPS Essential**
3. Distribution : **Ubuntu 24.04 LTS**
4. Datacenter : **Gravelines (GRA)** ou **Roubaix (RBX)**
5. Récupérer l'adresse IP et le mot de passe root par email

### Nom de domaine

Acheter un nom de domaine (OVH, Gandi, Cloudflare...) et configurer les DNS :

```
A     arthub.fr         → <IP_DU_VPS>
A     api.arthub.fr     → <IP_DU_VPS>
```

> Remplacer `arthub.fr` par votre nom de domaine réel.

---

## 2. Configuration initiale du VPS

### Première connexion

```bash
ssh root@<IP_DU_VPS>
```

### Créer un utilisateur non-root

```bash
adduser deploy
usermod -aG sudo deploy
```

### Configurer SSH (sécurité)

```bash
# Sur votre machine locale : copier la clé SSH
ssh-copy-id deploy@<IP_DU_VPS>
```

Éditer `/etc/ssh/sshd_config` :

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart sshd
```

### Pare-feu UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Mettre à jour le système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip software-properties-common
```

---

## 3. Installation des dépendances

### PHP 8.2+

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.2-fpm php8.2-cli php8.2-pgsql php8.2-xml \
    php8.2-mbstring php8.2-curl php8.2-intl php8.2-gd php8.2-zip \
    php8.2-opcache php8.2-apcu
```

### Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### Node.js 20 LTS (pour le build Angular)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Nginx

```bash
sudo apt install -y nginx
```

---

## 4. PostgreSQL

### Installation

```bash
sudo apt install -y postgresql postgresql-contrib
```

### Créer la base de données

```bash
sudo -u postgres psql
```

```sql
CREATE USER arthub_user WITH PASSWORD 'MOT_DE_PASSE_FORT';
CREATE DATABASE arthub_db OWNER arthub_user;
GRANT ALL PRIVILEGES ON DATABASE arthub_db TO arthub_user;
\q
```

> **Important** : Utiliser un mot de passe fort, jamais `root` ou `monmotdepasse`.

---

## 5. Déploiement du backend (Symfony)

### Cloner le dépôt

```bash
sudo mkdir -p /var/www/arthub-api
sudo chown deploy:deploy /var/www/arthub-api
cd /var/www/arthub-api
git clone <URL_DU_DEPOT_GIT> .
```

### Installer les dépendances

```bash
composer install --no-dev --optimize-autoloader
```

### Variables d'environnement

Créer le fichier `/var/www/arthub-api/.env.local` :

```env
APP_ENV=prod
APP_SECRET=<GENERER_AVEC_openssl_rand_-hex_32>

DATABASE_URL="pgsql://arthub_user:MOT_DE_PASSE_FORT@127.0.0.1:5432/arthub_db"

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=<PASSPHRASE_FORTE>

CORS_ALLOW_ORIGIN='^https://arthub\.fr$'

MAILER_DSN=smtp://user:password@smtp.provider.com:587
```

> Générer `APP_SECRET` avec : `openssl rand -hex 32`

### Générer les clés JWT

```bash
mkdir -p config/jwt
openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096
openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout
```

Entrer la passphrase définie dans `JWT_PASSPHRASE`.

### Exécuter les migrations

```bash
php bin/console doctrine:migrations:migrate --no-interaction
```

### Compiler le cache et les assets

```bash
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod
php bin/console assets:install public
```

### Compiler les variables d'environnement

```bash
composer dump-env prod
```

### Permissions

```bash
sudo chown -R deploy:www-data /var/www/arthub-api
sudo chmod -R 775 var/ public/media/
```

### Configurer PHP-FPM

Éditer `/etc/php/8.2/fpm/pool.d/www.conf` :

```ini
user = deploy
group = www-data
listen = /run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data
```

Optimiser `/etc/php/8.2/fpm/conf.d/99-arthub.ini` :

```ini
; Performance
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0

; Upload (images des œuvres)
upload_max_filesize=10M
post_max_size=12M

; Mémoire
memory_limit=256M

; Timezone
date.timezone=Europe/Paris
```

```bash
sudo systemctl restart php8.2-fpm
```

---

## 6. Déploiement du frontend (Angular)

### Builder sur votre machine locale (ou sur le serveur)

```bash
cd /var/www/arthub-frontend   # ou en local
```

Modifier `src/app/environments/environment.ts` pour la production :

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.arthub.fr',
};
```

Puis builder :

```bash
npm ci
npx ng build --configuration=production
```

### Copier le build sur le serveur

```bash
# Depuis votre machine locale
scp -r dist/arthub-frontend/browser/* deploy@<IP_DU_VPS>:/var/www/arthub-frontend/
```

Ou si le build est fait sur le serveur :

```bash
sudo mkdir -p /var/www/arthub-frontend
sudo chown deploy:deploy /var/www/arthub-frontend
cp -r dist/arthub-frontend/browser/* /var/www/arthub-frontend/
```

---

## 7. Configuration Nginx

### Backend API — `/etc/nginx/sites-available/api.arthub.fr`

```nginx
server {
    listen 80;
    server_name api.arthub.fr;
    root /var/www/arthub-api/public;

    # Taille max des uploads (images)
    client_max_body_size 12M;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;

        # Timeouts
        fastcgi_read_timeout 300;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;

        internal;
    }

    # Bloquer l'accès direct aux fichiers PHP
    location ~ \.php$ {
        return 404;
    }

    # Cache des images uploadées
    location /media/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/api.arthub.fr.access.log;
    error_log /var/log/nginx/api.arthub.fr.error.log;
}
```

### Frontend — `/etc/nginx/sites-available/arthub.fr`

```nginx
server {
    listen 80;
    server_name arthub.fr www.arthub.fr;
    root /var/www/arthub-frontend;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;

    # Fichiers Angular (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache des assets Angular (fichiers hashés)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/arthub.fr.access.log;
    error_log /var/log/nginx/arthub.fr.error.log;
}
```

### Activer les sites

```bash
sudo ln -s /etc/nginx/sites-available/api.arthub.fr /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/arthub.fr /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS avec Let's Encrypt

### Installer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtenir les certificats

```bash
sudo certbot --nginx -d arthub.fr -d www.arthub.fr -d api.arthub.fr
```

Certbot va automatiquement :
- Générer les certificats SSL
- Modifier les fichiers Nginx pour rediriger HTTP → HTTPS
- Configurer le renouvellement automatique

### Vérifier le renouvellement automatique

```bash
sudo certbot renew --dry-run
```

### Mettre à jour le CORS

Après activation du HTTPS, vérifier que `.env.local` utilise bien `https` :

```env
CORS_ALLOW_ORIGIN='^https://arthub\.fr$'
```

---

## 9. Emails en production

### Option 1 : Brevo (ex-Sendinblue) — Gratuit jusqu'à 300 emails/jour

1. Créer un compte sur [brevo.com](https://www.brevo.com/)
2. Récupérer les identifiants SMTP dans **Paramètres > SMTP & API**
3. Mettre à jour `.env.local` :

```env
MAILER_DSN=smtp://CLE_SMTP:MOT_DE_PASSE@smtp-relay.brevo.com:587
```

### Option 2 : Mailgun — 1000 emails/mois gratuits

```env
MAILER_DSN=smtp://postmaster@votre-domaine.mailgun.org:MOT_DE_PASSE@smtp.mailgun.org:587
```

### Option 3 : OVH Email Pro (si domaine chez OVH)

```env
MAILER_DSN=smtp://contact@arthub.fr:MOT_DE_PASSE@pro1.mail.ovh.net:587
```

---

## 10. Mises à jour et déploiement continu

### Script de déploiement — `/var/www/deploy.sh`

```bash
#!/bin/bash
set -e

echo "=== Déploiement ArtHub ==="
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ---------- BACKEND ----------
echo "[Backend] Pull des modifications..."
cd /var/www/arthub-api
git pull origin main

echo "[Backend] Installation des dépendances..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "[Backend] Migrations..."
php bin/console doctrine:migrations:migrate --no-interaction

echo "[Backend] Compilation cache..."
composer dump-env prod
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod

echo "[Backend] Permissions..."
sudo chown -R deploy:www-data var/ public/media/
sudo chmod -R 775 var/ public/media/

# ---------- FRONTEND ----------
echo "[Frontend] Pull des modifications..."
cd /var/www/arthub-frontend-src
git pull origin main

echo "[Frontend] Build..."
npm ci
npx ng build --configuration=production

echo "[Frontend] Copie des fichiers..."
rm -rf /var/www/arthub-frontend/*
cp -r dist/arthub-frontend/browser/* /var/www/arthub-frontend/

# ---------- REDÉMARRAGE ----------
echo "[Serveur] Redémarrage PHP-FPM..."
sudo systemctl restart php8.2-fpm

echo "=== Déploiement terminé ($TIMESTAMP) ==="
```

```bash
chmod +x /var/www/deploy.sh
```

Utilisation :

```bash
/var/www/deploy.sh
```

---

## 11. Maintenance et monitoring

### Logs utiles

```bash
# Logs Symfony
tail -f /var/www/arthub-api/var/log/prod.log

# Logs Nginx
tail -f /var/log/nginx/api.arthub.fr.error.log
tail -f /var/log/nginx/arthub.fr.error.log

# Logs PHP-FPM
tail -f /var/log/php8.2-fpm.log

# Logs PostgreSQL
tail -f /var/log/postgresql/postgresql-*-main.log
```

### Sauvegardes automatiques de la base de données

Créer `/var/www/backup-db.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/arthub"
mkdir -p $BACKUP_DIR

FILENAME="arthub_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump -U arthub_user arthub_db | gzip > "$BACKUP_DIR/$FILENAME"

# Garder les 30 dernières sauvegardes
ls -t $BACKUP_DIR/arthub_*.sql.gz | tail -n +31 | xargs -r rm
echo "Sauvegarde : $FILENAME"
```

Ajouter au cron (tous les jours à 3h du matin) :

```bash
crontab -e
```

```cron
0 3 * * * /var/www/backup-db.sh >> /var/log/arthub-backup.log 2>&1
```

### Supervision avec systemd

Vérifier que les services tournent :

```bash
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo systemctl status postgresql
```

Les activer au démarrage :

```bash
sudo systemctl enable nginx php8.2-fpm postgresql
```

---

## 12. Checklist finale

### Avant la mise en ligne

- [ ] VPS commandé et accessible en SSH
- [ ] Utilisateur `deploy` créé, connexion root désactivée
- [ ] Pare-feu UFW activé (SSH + Nginx)
- [ ] PHP 8.2, Composer, Node.js, Nginx, PostgreSQL installés
- [ ] Base de données créée avec un mot de passe fort
- [ ] Backend cloné dans `/var/www/arthub-api`
- [ ] `composer install --no-dev` exécuté
- [ ] `.env.local` configuré avec les valeurs de production
- [ ] `APP_SECRET` généré (jamais celui de dev)
- [ ] Clés JWT générées avec une passphrase forte
- [ ] Migrations exécutées
- [ ] Cache compilé (`cache:clear` + `cache:warmup`)
- [ ] `composer dump-env prod` exécuté
- [ ] Permissions `var/` et `public/media/` correctes
- [ ] Frontend buildé en mode production
- [ ] `environment.ts` pointe vers `https://api.arthub.fr`
- [ ] Nginx configuré pour les 2 domaines
- [ ] Certificats SSL obtenus avec Certbot
- [ ] CORS autorise uniquement le domaine de production
- [ ] Service email configuré (Brevo, Mailgun...)
- [ ] Script de déploiement créé et testé
- [ ] Sauvegarde automatique de la base en place
- [ ] Services activés au démarrage (`systemctl enable`)

### Vérification post-déploiement

```bash
# Tester l'API
curl https://api.arthub.fr/api

# Tester le frontend
curl -I https://arthub.fr

# Vérifier le certificat SSL
openssl s_client -connect api.arthub.fr:443 -servername api.arthub.fr < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## Résumé de l'architecture en production

```
                    ┌─────────────────────┐
                    │   Nom de domaine    │
                    │   arthub.fr         │
                    │   api.arthub.fr     │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   VPS OVH           │
                    │   Ubuntu 24.04      │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │    Nginx      │  │
                    │  │  (reverse     │  │
                    │  │   proxy +     │  │
                    │  │   SSL)        │  │
                    │  └──┬────────┬───┘  │
                    │     │        │       │
                    │  ┌──▼──┐ ┌──▼────┐  │
                    │  │Front│ │PHP-FPM│  │
                    │  │HTML │ │Symfony│  │
                    │  │CSS  │ │  API  │  │
                    │  │JS   │ │       │  │
                    │  └─────┘ └──┬────┘  │
                    │             │        │
                    │  ┌──────────▼─────┐  │
                    │  │  PostgreSQL    │  │
                    │  │  arthub_db     │  │
                    │  └────────────────┘  │
                    └─────────────────────┘
```
