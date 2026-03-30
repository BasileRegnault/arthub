# Documentation de déploiement — ArtHub

## Vue d'ensemble

ArtHub est un monorepo contenant :
- **`arthub-api/`** — Backend Symfony 7.3 + API Platform
- **`arthub-frontend/`** — Frontend Angular 17+
- **`docker/`** — Configuration Nginx
- **`docker-compose.yml`** — Stack de production (Docker)
- **`docker-compose.dev.yml`** — Stack de développement local

Le déploiement repose sur :
- Un **VPS OVH** (Ubuntu 24.04) avec Docker
- **GitHub Actions** pour le CI/CD automatique
- **GitHub Container Registry (ghcr.io)** pour stocker les images Docker
- **Certbot / Let's Encrypt** pour le SSL gratuit

---

## Architecture de production

```
Internet
    │
    ▼
Nginx (conteneur) — ports 80 et 443
    ├── arthubb.fr / www.arthubb.fr  →  Frontend Angular (conteneur)
    └── api.arthubb.fr               →  PHP-FPM Symfony (conteneur)
                                              │
                                        PostgreSQL (conteneur)
```

---

## Prérequis

- Compte GitHub avec le repo : https://github.com/BasileRegnault/arthub
- VPS OVH avec Ubuntu 24.04 (minimum VPS Value ~7€/mois)
- Nom de domaine : `arthubb.fr`
- Docker installé sur le VPS

---

## PARTIE 1 — Configuration initiale du VPS (une seule fois)

### 1.1 Première connexion

OVH envoie les accès par email (IP + mot de passe ubuntu).

```bash
ssh ubuntu@<IP_DU_VPS>
```

### 1.2 Créer un utilisateur dédié

```bash
adduser arthub
usermod -aG sudo arthub
```

### 1.3 Installer Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
usermod -aG docker arthub
```

### 1.4 Configurer le pare-feu

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 1.5 Générer la clé SSH pour GitHub Actions

Sur **ta machine locale** :

```bash
# Windows — utiliser le chemin complet (~ ne fonctionne pas)
mkdir C:\Users\<TON_USER>\.ssh
ssh-keygen -t ed25519 -C "github-actions-deploy" -f C:\Users\<TON_USER>\.ssh\arthub_deploy
# Laisser la passphrase vide
```

Afficher la clé publique :
```bash
cat C:\Users\<TON_USER>\.ssh\arthub_deploy.pub
```

Sur le **VPS**, ajouter la clé publique :
```bash
sudo mkdir -p /home/arthub/.ssh
sudo bash -c 'echo "COLLER_LA_CLÉ_PUBLIQUE_ICI" > /home/arthub/.ssh/authorized_keys'
sudo chmod 700 /home/arthub/.ssh
sudo chmod 600 /home/arthub/.ssh/authorized_keys
sudo chown -R arthub:arthub /home/arthub/.ssh
```

Tester depuis la machine locale :
```bash
ssh -i C:\Users\<TON_USER>\.ssh\arthub_deploy arthub@<IP_DU_VPS>
```

### 1.6 Cloner le projet

```bash
sudo mkdir -p /opt/arthub
sudo chown arthub:arthub /opt/arthub
cd /opt/arthub

# Repo public
git clone https://github.com/BasileRegnault/arthub.git .

# Repo privé : utiliser un token GitHub
# GitHub → Settings → Developer settings → Personal access tokens → classic → repo
git clone https://github.com/BasileRegnault/arthub.git .
# Username: BasileRegnault  |  Password: LE_TOKEN
```

### 1.7 Créer le fichier .env de production

```bash
cp /opt/arthub/.env.docker /opt/arthub/.env
nano /opt/arthub/.env
```

Remplir avec les vraies valeurs :

```env
POSTGRES_DB=arthub_db
POSTGRES_USER=arthub_user
# ⚠️  Pas de caractères spéciaux (!, ?, @, #) dans le mot de passe
# Générer avec : openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
POSTGRES_PASSWORD=UnMotDePasseSansCaracteresSpeciaux

# Générer avec : openssl rand -hex 32
APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

JWT_PASSPHRASE=UnePhraseLongueEtSecrete

CORS_ALLOW_ORIGIN='^https://arthubb\.fr$'
API_BASE_URL=https://api.arthubb.fr

# Brevo : smtp://LOGIN:MDP@smtp-relay.brevo.com:587
MAILER_DSN=smtp://user:password@smtp-relay.brevo.com:587
```

> **Attention** : Les caractères spéciaux (`!`, `?`, `@`, `#`) dans `POSTGRES_PASSWORD`
> cassent le `DATABASE_URL` car il est intégré dans une URL.
> Utiliser uniquement lettres, chiffres et `_`.

### 1.8 Premier démarrage

```bash
# Se déconnecter et reconnecter pour appliquer le groupe docker
exit
ssh -i C:\Users\<TON_USER>\.ssh\arthub_deploy arthub@<IP_DU_VPS>
cd /opt/arthub

# Build et démarrage (premier lancement)
docker compose up -d --build

# Vérifier que tous les conteneurs tournent
docker compose ps
```

### 1.9 Initialiser l'application

```bash
# Générer les clés JWT
# ⚠️  Lancer en root car le dossier config/jwt/ nécessite des droits d'écriture
docker compose exec -u root api php bin/console lexik:jwt:generate-keypair --env=prod
docker compose exec -u root api chown -R www-data:www-data /app/config/jwt

# Lancer les migrations
docker compose exec api php bin/console doctrine:migrations:migrate --env=prod --no-interaction
```

---

## PARTIE 2 — Configuration DNS (une seule fois)

Dans **espace client OVH → Noms de domaine → arthubb.fr → Zone DNS**, créer ou modifier :

| Sous-domaine | Type | Cible |
|---|---|---|
| `arthubb.fr` | A | `<IP_DU_VPS>` |
| `www` | A | `<IP_DU_VPS>` |
| `api` | A | `<IP_DU_VPS>` |

> OVH crée des enregistrements par défaut qui pointent vers leur page de parking.
> Il faut les **modifier**, pas en ajouter de nouveaux.

Vérifier la propagation (15 min à 2h) :
```bash
nslookup arthubb.fr       # doit retourner l'IP du VPS
nslookup api.arthubb.fr   # doit retourner l'IP du VPS
```

Ou via : https://dnschecker.org/#A/arthubb.fr

---

## PARTIE 3 — SSL avec Certbot (une seule fois, après propagation DNS)

```bash
cd /opt/arthub

# ⚠️  Utiliser --entrypoint pour bypasser l'entrypoint du conteneur certbot
docker compose run --rm --entrypoint certbot certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d arthubb.fr -d www.arthubb.fr -d api.arthubb.fr \
  --email basile.regnault@gmail.com --agree-tos --no-eff-email
```

Une fois les certificats obtenus, recharger Nginx pour activer HTTPS :
```bash
docker compose restart nginx
```

Le site est maintenant accessible en HTTPS :
- https://arthubb.fr → Frontend
- https://api.arthubb.fr → API

Le renouvellement SSL est automatique (le conteneur certbot tourne en arrière-plan).

---

## PARTIE 4 — CI/CD avec GitHub Actions

### 4.1 Configurer les secrets GitHub

Dans GitHub → repo arthub → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP du VPS OVH |
| `VPS_USER` | `arthub` |
| `VPS_SSH_KEY` | Contenu entier de `~/.ssh/arthub_deploy` (clé privée) |
| `API_BASE_URL` | `https://api.arthubb.fr` |

### 4.2 Fonctionnement du pipeline

Le fichier `.github/workflows/deploy.yml` se déclenche à chaque `git push` sur `main` :

```
git push origin main
        │
        ▼
GitHub Actions
  ├── Job 1 : Build image API  → ghcr.io/basilregnault/arthub-api:latest
  ├── Job 2 : Build image Frontend → ghcr.io/basilregnault/arthub-frontend:latest
  └── Job 3 : Deploy sur VPS
        ├── git pull
        ├── docker compose pull
        ├── docker compose up -d
        └── doctrine:migrations:migrate
```

### 4.3 Workflow quotidien

```bash
# Coder, committer, pousser → déploiement automatique
git add .
git commit -m "feat: ma nouvelle fonctionnalité"
git push origin main

# Suivre le déploiement : GitHub → onglet Actions
```

---

## PARTIE 5 — Opérations courantes

### Voir les logs

```bash
# Logs de tous les conteneurs
docker compose logs -f

# Logs d'un conteneur spécifique
docker compose logs -f api
docker compose logs -f nginx
docker compose logs -f database
```

### Redémarrer un conteneur

```bash
docker compose restart api
docker compose restart nginx
```

### Relancer les migrations manuellement

```bash
docker compose exec api php bin/console doctrine:migrations:migrate --env=prod --no-interaction
```

### Vider le cache Symfony

```bash
docker compose exec api php bin/console cache:clear --env=prod
```

### Mettre à jour manuellement sans CI/CD

```bash
cd /opt/arthub
git pull origin main
docker compose pull
docker compose up -d
docker compose exec api php bin/console doctrine:migrations:migrate --env=prod --no-interaction
```

### Sauvegarder la base de données

```bash
docker compose exec database pg_dump -U arthub_user arthub_db > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde

```bash
cat backup_20240101.sql | docker compose exec -T database psql -U arthub_user arthub_db
```

---

## PARTIE 6 — Problèmes rencontrés et solutions

### ❌ `repository name must be lowercase`
Les noms d'images Docker doivent être en minuscules.
→ Utiliser `ghcr.io/basilregnault/` (pas `BasileRegnault`).

### ❌ `lcobucci/clock requires php ~8.3`
Le `composer.lock` requiert PHP 8.3 mais le Dockerfile utilisait PHP 8.2.
→ Mettre à jour le Dockerfile : `FROM php:8.3-fpm-alpine`.

### ❌ `Unable to read the "/app/.env" environment file`
Symfony cherche un `.env` même en prod avec Docker.
→ Créer un `.env` minimal dans l'image finale du Dockerfile :
```dockerfile
RUN echo "APP_ENV=prod" > /app/.env && echo "APP_DEBUG=0" >> /app/.env
```

### ❌ `symfony/http-client class does not exist`
`symfony/http-client` était en `require-dev` mais utilisé en prod.
→ Le déplacer dans `require` dans `composer.json`.

### ❌ `Invalid platform version ""`
`DATABASE_URL` sans `?serverVersion=16` dans `docker-compose.yml`.
→ Ajouter `?serverVersion=16` à la fin de l'URL.

### ❌ `Environment variable not found: JWT_SECRET_KEY`
Variables JWT manquantes dans `docker-compose.yml`.
→ Ajouter dans la section `environment` du service `api` :
```yaml
JWT_SECRET_KEY: /app/config/jwt/private.pem
JWT_PUBLIC_KEY: /app/config/jwt/public.pem
```

### ❌ `Permission denied` sur `config/jwt/`
Le conteneur tourne en `www-data` qui ne peut pas écrire dans `config/jwt/`.
→ Générer les clés en root :
```bash
docker compose exec -u root api php bin/console lexik:jwt:generate-keypair --env=prod
docker compose exec -u root api chown -R www-data:www-data /app/config/jwt
```

### ❌ `password authentication failed` pour PostgreSQL
Le volume PostgreSQL contient l'ancien mot de passe (créé avec le placeholder).
→ Supprimer le volume et le recréer :
```bash
docker compose down
docker volume rm arthub_db-data
docker compose up -d
```

### ❌ Caractères spéciaux dans `POSTGRES_PASSWORD`
Les caractères `!`, `?`, `@`, `#` cassent le `DATABASE_URL` (intégré dans une URL).
→ Utiliser uniquement lettres, chiffres et `_` dans le mot de passe PostgreSQL.

### ❌ `No renewals were attempted` avec Certbot
Le `docker-compose.yml` définit un entrypoint personnalisé pour certbot qui écrase la commande.
→ Utiliser `--entrypoint` pour le bypasser :
```bash
docker compose run --rm --entrypoint certbot certbot certonly ...
```

### ❌ Certbot échoue avec `Invalid response` / `NXDOMAIN`
Le DNS n'est pas encore propagé ou pointe encore vers la page OVH de parking.
→ Modifier les enregistrements DNS dans la zone OVH et attendre la propagation.
Vérifier avec `nslookup arthubb.fr` avant de relancer Certbot.

### ❌ `GalleryCollectionViewsProvider` class not found
Le fichier PHP `GalleryCollectionViewsProvider.php` contenait une classe nommée différemment (`GalleryViewsCollectionDecorator`).
→ Renommer la classe pour qu'elle corresponde au nom du fichier, et mettre à jour `services.yaml`.
