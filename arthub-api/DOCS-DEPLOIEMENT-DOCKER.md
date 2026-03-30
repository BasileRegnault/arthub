# Guide de mise en production avec Docker — ArtHub

Ce guide décrit le déploiement complet du projet ArtHub avec **Docker Compose** sur un **VPS OVH**.

> Pour un déploiement **sans Docker** (installation manuelle), voir [DOCS-DEPLOIEMENT.md](./DOCS-DEPLOIEMENT.md).

---

## Sommaire

1. [Architecture Docker](#1-architecture-docker)
2. [Prérequis — VPS OVH](#2-prérequis--vps-ovh)
3. [Installation de Docker sur le VPS](#3-installation-de-docker-sur-le-vps)
4. [Structure des fichiers](#4-structure-des-fichiers)
5. [Configuration](#5-configuration)
6. [Premier déploiement](#6-premier-déploiement)
7. [HTTPS avec Let's Encrypt](#7-https-avec-lets-encrypt)
8. [Commandes utiles](#8-commandes-utiles)
9. [Mises à jour](#9-mises-à-jour)
10. [Sauvegardes](#10-sauvegardes)
11. [Développement local avec Docker](#11-développement-local-avec-docker)
12. [Dépannage](#12-dépannage)
13. [Checklist finale](#13-checklist-finale)

---

## 1. Architecture Docker

```
                    ┌──────────────────────────────────────────┐
                    │             VPS OVH (Ubuntu)             │
                    │                                          │
   Port 80/443 ──▶ │  ┌────────────────────────────────────┐  │
                    │  │         Nginx (reverse proxy)      │  │
                    │  │    arthub.fr → frontend:80          │  │
                    │  │    api.arthub.fr → api:9000         │  │
                    │  │    + SSL (Let's Encrypt)            │  │
                    │  └──────┬─────────────────┬───────────┘  │
                    │         │                 │               │
                    │  ┌──────▼──────┐   ┌──────▼───────────┐  │
                    │  │  Frontend   │   │   API (PHP-FPM)  │  │
                    │  │  Angular    │   │   Symfony 7.3    │  │
                    │  │  + Nginx    │   │   + JWT Auth     │  │
                    │  └─────────────┘   └──────┬───────────┘  │
                    │                           │               │
                    │                    ┌──────▼───────────┐  │
                    │                    │   PostgreSQL 16  │  │
                    │                    │   (volume Docker)│  │
                    │                    └──────────────────┘  │
                    └──────────────────────────────────────────┘
```

### Conteneurs

| Conteneur | Image | Rôle | Port |
|-----------|-------|------|------|
| `arthub-nginx` | nginx:alpine | Reverse proxy + SSL | 80, 443 |
| `arthub-api` | php:8.2-fpm-alpine | API Symfony | 9000 (interne) |
| `arthub-frontend` | node → nginx:alpine | SPA Angular | 80 (interne) |
| `arthub-db` | postgres:16-alpine | Base de données | 5432 |
| `arthub-certbot` | certbot/certbot | Certificats SSL | — |

### Volumes persistants

| Volume | Contenu |
|--------|---------|
| `db-data` | Données PostgreSQL |
| `api-uploads` | Images uploadées (œuvres) |
| `api-jwt` | Clés JWT |
| `certbot-conf` | Certificats SSL |
| `certbot-www` | Challenge ACME |

---

## 2. Prérequis — VPS OVH

### Commander le VPS

1. Aller sur [ovhcloud.com/fr/vps](https://www.ovhcloud.com/fr/vps/)
2. Choisir **VPS Essential** (2 vCores, 4 Go RAM, ~8 €/mois)
3. Distribution : **Ubuntu 24.04 LTS**
4. Datacenter : **Gravelines (GRA)** ou **Roubaix (RBX)**

### DNS

Configurer les enregistrements DNS :

```
A     arthub.fr         → <IP_DU_VPS>
A     www.arthub.fr     → <IP_DU_VPS>
A     api.arthub.fr     → <IP_DU_VPS>
```

### Sécuriser le VPS

```bash
# Première connexion
ssh root@<IP_DU_VPS>

# Créer un utilisateur
adduser deploy
usermod -aG sudo deploy

# Copier la clé SSH (depuis votre machine locale)
ssh-copy-id deploy@<IP_DU_VPS>

# Désactiver le login root (/etc/ssh/sshd_config)
# PermitRootLogin no
# PasswordAuthentication no
sudo systemctl restart sshd

# Pare-feu
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Mises à jour
sudo apt update && sudo apt upgrade -y
```

---

## 3. Installation de Docker sur le VPS

```bash
# Dépendances
sudo apt install -y ca-certificates curl gnupg

# Clé GPG Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Dépôt Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker + Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker deploy
newgrp docker

# Vérifier
docker --version
docker compose version
```

---

## 4. Structure des fichiers

```
/var/www/arthub/                    ← Répertoire racine sur le VPS
├── docker-compose.yml              ← Orchestration des conteneurs
├── .env                            ← Variables d'environnement (secrets)
├── docker/
│   └── nginx/
│       └── default.conf            ← Configuration Nginx (reverse proxy)
├── arthub-api/                     ← Code source du backend
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── composer.json
│   ├── config/jwt/                 ← Clés JWT (générées au déploiement)
│   ├── public/uploads/             ← Images (volume Docker)
│   └── src/
└── arthub-frontend/                ← Code source du frontend
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf                  ← Config Nginx du conteneur frontend
    └── src/
```

---

## 5. Configuration

### Cloner les dépôts sur le VPS

```bash
sudo mkdir -p /var/www/arthub
sudo chown deploy:deploy /var/www/arthub
cd /var/www/arthub

git clone <URL_DEPOT_BACKEND> arthub-api
git clone <URL_DEPOT_FRONTEND> arthub-frontend
```

### Copier les fichiers Docker

Les fichiers `docker-compose.yml`, `docker/nginx/default.conf` et `.env.docker` se trouvent dans le dépôt parent. Si vous les versionnez séparément :

```bash
# Depuis votre machine locale
scp docker-compose.yml deploy@<IP_DU_VPS>:/var/www/arthub/
scp .env.docker deploy@<IP_DU_VPS>:/var/www/arthub/.env
scp -r docker/ deploy@<IP_DU_VPS>:/var/www/arthub/
```

### Configurer les variables d'environnement

```bash
cd /var/www/arthub
cp .env.docker .env
nano .env
```

Renseigner les valeurs :

```env
# --- PostgreSQL ---
POSTGRES_DB=arthub_db
POSTGRES_USER=arthub_user
POSTGRES_PASSWORD=Un_Vrai_Mot_De_Passe_Fort_2025!

# --- Symfony ---
APP_SECRET=a1b2c3d4...   # openssl rand -hex 32
JWT_PASSPHRASE=MaPassphraseJWT_Forte!

# --- CORS (production) ---
CORS_ALLOW_ORIGIN='^https://arthub\.fr$'

# --- URL de l'API (injectée dans le build frontend) ---
API_BASE_URL=https://api.arthub.fr

# --- Mailer (ex: Brevo) ---
MAILER_DSN=smtp://CLE:MDP@smtp-relay.brevo.com:587
```

### Générer les clés JWT

```bash
mkdir -p arthub-api/config/jwt

openssl genpkey -out arthub-api/config/jwt/private.pem \
    -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096

openssl pkey -in arthub-api/config/jwt/private.pem \
    -out arthub-api/config/jwt/public.pem -pubout
```

> Entrer la passphrase définie dans `JWT_PASSPHRASE`.

---

## 6. Premier déploiement

### Étape 1 — Builder et lancer

```bash
cd /var/www/arthub

# Builder toutes les images
docker compose build

# Lancer tous les services
docker compose up -d
```

### Étape 2 — Exécuter les migrations

```bash
docker compose exec api php bin/console doctrine:migrations:migrate --no-interaction
```

### Étape 3 — Vérifier que tout tourne

```bash
# État des conteneurs
docker compose ps

# Résultat attendu :
# NAME               STATUS          PORTS
# arthub-api         Up              9000/tcp
# arthub-db          Up (healthy)    0.0.0.0:5432->5432/tcp
# arthub-frontend    Up              80/tcp
# arthub-nginx       Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Étape 4 — Tester

```bash
# API
curl http://localhost/api          # (via Nginx → api:9000)
curl http://<IP_DU_VPS>/api       # Depuis l'extérieur

# Frontend
curl http://<IP_DU_VPS>           # Page d'accueil Angular
```

---

## 7. HTTPS avec Let's Encrypt

### Étape 1 — Obtenir les certificats

S'assurer que les DNS pointent vers le VPS, puis :

```bash
# Arrêter Nginx temporairement
docker compose stop nginx

# Obtenir les certificats
docker compose run --rm certbot certonly \
    --standalone \
    -d arthub.fr \
    -d www.arthub.fr \
    -d api.arthub.fr \
    --email votre-email@example.com \
    --agree-tos \
    --no-eff-email

# Relancer Nginx
docker compose start nginx
```

### Étape 2 — Activer SSL dans Nginx

Éditer `docker/nginx/default.conf` :

1. **Décommenter** le bloc de redirection HTTP → HTTPS (lignes 10-20)
2. **Décommenter** les lignes `listen 443 ssl` et `ssl_certificate*` dans les deux blocs server
3. **Commenter** les lignes `listen 80` dans les blocs frontend et API

### Étape 3 — Recharger Nginx

```bash
docker compose exec nginx nginx -s reload
```

### Renouvellement automatique

Ajouter au cron de l'utilisateur `deploy` :

```bash
crontab -e
```

```cron
# Renouveler les certificats tous les jours à 3h
0 3 * * * cd /var/www/arthub && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

---

## 8. Commandes utiles

### Gestion des conteneurs

```bash
# Voir les logs en temps réel
docker compose logs -f
docker compose logs -f api          # Logs d'un seul service
docker compose logs -f nginx

# Redémarrer un service
docker compose restart api
docker compose restart nginx

# Arrêter tout
docker compose down

# Arrêter et supprimer les volumes (⚠️ perte de données)
docker compose down -v
```

### Accéder à un conteneur

```bash
# Shell dans le conteneur API
docker compose exec api sh

# Console Symfony
docker compose exec api php bin/console

# Shell PostgreSQL
docker compose exec database psql -U arthub_user -d arthub_db
```

### Base de données

```bash
# Exécuter les migrations
docker compose exec api php bin/console doctrine:migrations:migrate --no-interaction

# Charger les fixtures (dev uniquement !)
docker compose exec api php bin/console doctrine:fixtures:load --no-interaction

# Vider le cache Symfony
docker compose exec api php bin/console cache:clear --env=prod
```

---

## 9. Mises à jour

### Script de déploiement — `deploy.sh`

Créer `/var/www/arthub/deploy.sh` :

```bash
#!/bin/bash
set -e

echo "=== Déploiement ArtHub (Docker) ==="
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cd /var/www/arthub

# Pull du code
echo "[1/5] Pull des modifications..."
cd arthub-api && git pull origin main && cd ..
cd arthub-frontend && git pull origin main && cd ..

# Rebuild des images
echo "[2/5] Build des images Docker..."
docker compose build

# Redémarrer les services
echo "[3/5] Redémarrage des services..."
docker compose up -d

# Migrations
echo "[4/5] Exécution des migrations..."
docker compose exec -T api php bin/console doctrine:migrations:migrate --no-interaction

# Cache
echo "[5/5] Vidage du cache..."
docker compose exec -T api php bin/console cache:clear --env=prod

echo "=== Déploiement terminé ($TIMESTAMP) ==="
docker compose ps
```

```bash
chmod +x /var/www/arthub/deploy.sh
```

Utilisation :

```bash
/var/www/arthub/deploy.sh
```

### Déploiement sans interruption (zero-downtime)

Pour les mises à jour sans coupure, rebuilder service par service :

```bash
# Rebuilder et relancer seulement l'API
docker compose build api
docker compose up -d --no-deps api
docker compose exec -T api php bin/console doctrine:migrations:migrate --no-interaction

# Rebuilder et relancer seulement le frontend
docker compose build frontend
docker compose up -d --no-deps frontend
```

---

## 10. Sauvegardes

### Sauvegarde de la base de données

```bash
#!/bin/bash
# /var/www/arthub/backup-db.sh
BACKUP_DIR="/var/backups/arthub"
mkdir -p $BACKUP_DIR

FILENAME="arthub_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose exec -T database pg_dump -U arthub_user arthub_db | gzip > "$BACKUP_DIR/$FILENAME"

# Garder les 30 dernières sauvegardes
ls -t $BACKUP_DIR/arthub_*.sql.gz | tail -n +31 | xargs -r rm

echo "Sauvegarde : $FILENAME ($(du -h "$BACKUP_DIR/$FILENAME" | cut -f1))"
```

### Sauvegarde des uploads

```bash
# Les uploads sont dans un volume Docker
docker compose cp api:/app/public/uploads /var/backups/arthub/uploads-$(date +%Y%m%d)/
```

### Restaurer une sauvegarde

```bash
# Restaurer la base
gunzip < /var/backups/arthub/arthub_20260215.sql.gz | \
    docker compose exec -T database psql -U arthub_user -d arthub_db
```

### Cron automatique

```cron
# Sauvegarde BDD tous les jours à 3h
0 3 * * * /var/www/arthub/backup-db.sh >> /var/log/arthub-backup.log 2>&1
```

---

## 11. Développement local avec Docker

Pour le développement local, un `docker-compose.dev.yml` simplifié est fourni. Il lance uniquement PostgreSQL et Mailhog :

```bash
# Depuis le dossier parent des deux projets
docker compose -f docker-compose.dev.yml up -d
```

Puis lancer manuellement :

```bash
# Terminal 1 — Backend Symfony
cd arthub-api
symfony server:start    # ou php -S localhost:8000 -t public

# Terminal 2 — Frontend Angular
cd arthub-frontend
ng serve
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| API | http://localhost:8000/api |
| Mailhog (emails) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |

---

## 12. Dépannage

### Le conteneur API ne démarre pas

```bash
# Voir les logs
docker compose logs api

# Erreur courante : "An exception occurred in the driver"
# → Vérifier que la base de données est prête
docker compose exec database pg_isready -U arthub_user

# Erreur courante : "Permission denied" sur var/
docker compose exec api chown -R www-data:www-data var/
```

### Le frontend affiche une page blanche

```bash
# Vérifier le build
docker compose logs frontend

# Vérifier que l'API_BASE_URL est correcte
docker compose exec frontend sh -c 'grep apiBaseUrl /usr/share/nginx/html/main*.js'
```

### Erreur 502 Bad Gateway

```bash
# L'API n'est pas joignable par Nginx
docker compose ps    # Vérifier que api est "Up"
docker compose restart api
docker compose logs nginx
```

### Les images ne s'affichent pas

```bash
# Vérifier le volume uploads
docker compose exec api ls -la public/uploads/artworks/

# Vérifier la config Nginx
docker compose exec nginx nginx -t
```

### Problème de CORS

```bash
# Vérifier la variable CORS
docker compose exec api php bin/console debug:container --env-vars | grep CORS

# Doit afficher : CORS_ALLOW_ORIGIN = '^https://arthub\.fr$'
```

### Rebuilder tout de zéro

```bash
# Arrêter et rebuilder sans cache
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec -T api php bin/console doctrine:migrations:migrate --no-interaction
```

---

## 13. Checklist finale

### Configuration serveur

- [ ] VPS OVH commandé (Ubuntu 24.04)
- [ ] Utilisateur `deploy` créé, root SSH désactivé
- [ ] Pare-feu UFW activé (SSH + 80 + 443)
- [ ] Docker et Docker Compose installés
- [ ] DNS configurés (`arthub.fr`, `api.arthub.fr` → IP du VPS)

### Configuration Docker

- [ ] Dépôts clonés dans `/var/www/arthub/`
- [ ] `.env` créé avec les secrets de production
- [ ] `POSTGRES_PASSWORD` → mot de passe fort
- [ ] `APP_SECRET` → généré avec `openssl rand -hex 32`
- [ ] `JWT_PASSPHRASE` → passphrase forte
- [ ] `API_BASE_URL` → `https://api.arthub.fr`
- [ ] `CORS_ALLOW_ORIGIN` → `'^https://arthub\.fr$'`
- [ ] `MAILER_DSN` → service email configuré
- [ ] Clés JWT générées dans `arthub-api/config/jwt/`

### Déploiement

- [ ] `docker compose build` réussi
- [ ] `docker compose up -d` — tous les conteneurs sont "Up"
- [ ] Migrations exécutées
- [ ] `curl http://<IP>/api` retourne la doc API Platform
- [ ] `curl http://<IP>` retourne le frontend Angular

### SSL et production

- [ ] Certificats Let's Encrypt obtenus
- [ ] Nginx configuré en HTTPS
- [ ] Redirection HTTP → HTTPS activée
- [ ] `https://arthub.fr` fonctionne
- [ ] `https://api.arthub.fr/api` fonctionne

### Maintenance

- [ ] Script `deploy.sh` créé et testé
- [ ] Script `backup-db.sh` créé et testé
- [ ] Cron de sauvegarde activé
- [ ] Cron de renouvellement SSL activé
