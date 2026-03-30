# ArtHub - Documentation Générale

## Présentation du projet

**ArtHub** est une plateforme web de gestion et de découverte d'œuvres d'art. Elle permet aux utilisateurs de parcourir des artistes et des œuvres, de créer des galeries personnalisées, de noter des œuvres et de soumettre de nouveaux contenus. Un back-office administrateur fournit un tableau de bord complet avec statistiques, gestion des contenus et système de validation.

---

## Architecture technique

```
arthub-frontend/    (Angular 20 - Interface utilisateur)
    |
    | HTTP / REST (JSON-LD)
    v
arthub-api/         (Symfony 7.3 + API Platform - API REST)
    |
    | Doctrine ORM
    v
PostgreSQL          (Base de données)
```

| Couche | Technologie | Port par défaut |
|--------|------------|-----------------|
| Frontend | Angular 20, Tailwind CSS, Chart.js | `http://localhost:4200` |
| Backend API | Symfony 7.3, API Platform 4.2 | `http://localhost:8000` |
| Base de données | PostgreSQL | `127.0.0.1:5432` |
| Authentification | JWT (Lexik JWT Bundle) | - |
| Upload fichiers | Vich Uploader Bundle | - |
| Emails (dev) | Mailtrap SMTP | - |

---

## Modèle de données

### Entités principales

```
User (Utilisateur)
 ├── id, username, email, password, roles, isSuspended
 ├── profilePicture -> MediaObject
 ├── galleries[] -> Gallery
 ├── ratings[] -> Rating
 ├── artworks[] -> Artwork (createdBy)
 └── artists[] -> Artist (createdBy)

Artist (Artiste)
 ├── id, firstname, lastname, bornAt, diedAt, nationality, biography
 ├── profilePicture -> MediaObject
 ├── isConfirmCreate, toBeConfirmed (validation)
 ├── artworks[] -> Artwork
 └── createdBy -> User

Artwork (Œuvre)
 ├── id, title, type, style, creationDate, description, location
 ├── image -> MediaObject
 ├── artist -> Artist
 ├── isDisplay, isConfirmCreate, toBeConfirmed
 ├── galleries[] -> Gallery (ManyToMany)
 ├── ratings[] -> Rating
 └── createdBy -> User

Gallery (Galerie)
 ├── id, name, description, isPublic
 ├── coverImage -> MediaObject
 ├── artworks[] -> Artwork (ManyToMany)
 └── createdBy -> User

Rating (Note)
 ├── id, score (0-5), comment
 ├── artwork -> Artwork
 └── createdBy -> User

MediaObject (Fichier média)
 └── id, filePath, contentUrl
```

### Entités de suivi

| Entité | Rôle |
|--------|------|
| `UserLoginLog` | Journal des connexions (succès/échecs) |
| `ActivityLog` | Journal des modifications admin (create/update/delete) |
| `ArtworkDailyView` | Comptage des vues quotidiennes par œuvre |
| `GalleryDailyView` | Comptage des vues quotidiennes par galerie |
| `ValidationDecision` | Historique des décisions de validation (approbation/rejet) |
| `PasswordResetToken` | Tokens de réinitialisation de mot de passe |

---

## Énumérations

| Enum | Valeurs |
|------|---------|
| `ArtworkType` | Painting, Sculpture, Drawing, Photography |
| `ArtworkStyle` | Impressionism, Realism, Cubism, Abstract |
| `ValidationStatus` | approved, rejected |
| `ValidationSubjectType` | artist, artwork |
| `AuthEvent` | REGISTER_SUCCESS, REGISTER_FAILED, LOGIN_SUCCESS, LOGIN_FAILED |
| `UserRole` | ROLE_USER, ROLE_ADMIN |

---

## Sécurité et authentification

### Flux d'authentification

1. **Connexion** : `POST /api/login` avec email/password → retourne un token JWT + refresh token
2. **Requêtes authentifiées** : header `Authorization: Bearer <token>`
3. **Rafraîchissement** : `POST /api/token/refresh` avec le refresh token
4. **Déconnexion** : suppression locale des tokens (côté client)

### Contrôle d'accès

| Action | Permission requise |
|--------|-------------------|
| Parcourir œuvres, artistes, galeries | Public |
| Créer une œuvre, un artiste, une galerie | `ROLE_USER` (connecté) |
| Modifier son propre contenu | `ROLE_USER` (propriétaire) |
| Accéder au back-office admin | `ROLE_ADMIN` |
| Supprimer du contenu | `ROLE_ADMIN` |
| Valider/rejeter des soumissions | `ROLE_ADMIN` |
| Gérer les utilisateurs | `ROLE_ADMIN` |

### Mot de passe oublié

Approche simplifiée :
1. L'utilisateur saisit son email sur `/auth/forgot-password`
2. Le backend génère un mot de passe aléatoire (12 caractères)
3. Le nouveau mot de passe est envoyé par email via Mailtrap
4. Le message de réponse est identique que le compte existe ou non (sécurité)

---

## Fonctionnalités

### Côté public (utilisateur)

- **Accueil** : œuvres récentes, artistes, statistiques de la plateforme
- **Œuvres** : parcourir, filtrer (type, style, artiste), voir le détail, noter
- **Artistes** : parcourir, voir le profil et les œuvres associées
- **Galeries** : galeries publiques, créer ses propres galeries, ajouter des œuvres
- **Carte** : carte interactive des artistes par nationalité
- **Profil** : gestion du compte, photo de profil, mes soumissions
- **Notes** : noter les œuvres (1-5 étoiles + commentaire)

### Côté admin (back-office)

- **Dashboard** : KPIs, graphiques (Chart.js), tables des dernières activités
- **Gestion œuvres** : CRUD complet, filtres avancés, pagination
- **Gestion artistes** : CRUD complet, filtres avancés, pagination
- **Gestion galeries** : CRUD complet, filtres avancés, pagination
- **Gestion utilisateurs** : liste, détail, suspension, suppression
- **Validations** : système d'approbation/rejet des artistes et œuvres soumis

---

## Installation et démarrage

### Prérequis

- Node.js 18+ et npm
- PHP 8.2+ et Composer
- PostgreSQL
- OpenSSL (pour les clés JWT)

### Backend (arthub-api)

```bash
cd arthub-api

# Installer les dépendances
composer install

# Configurer la base de données dans .env.local
# DATABASE_URL="pgsql://user:password@127.0.0.1:5432/arthub"

# Configurer le mailer (Mailtrap) dans .env.local
# MAILER_DSN=smtp://USERNAME:PASSWORD@sandbox.smtp.mailtrap.io:2525

# Générer les clés JWT
php bin/console lexik:jwt:generate-keypair

# Créer la base et exécuter les migrations
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate

# (Optionnel) Charger les fixtures
php bin/console doctrine:fixtures:load

# Lancer le serveur
symfony server:start
# ou
php -S localhost:8000 -t public
```

### Frontend (arthub-frontend)

```bash
cd arthub-frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
# ou
ng serve --proxy-config proxy.conf.json

# Ouvrir http://localhost:4200
```

### Configuration des emails (Mailtrap)

1. Créer un compte gratuit sur [mailtrap.io](https://mailtrap.io)
2. Aller dans **Email Testing > Inboxes**
3. Copier les identifiants SMTP (Username et Password)
4. Les renseigner dans le fichier `.env` ou `.env.local` du backend

---

## Endpoints API principaux

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/login` | Connexion (JWT) |
| POST | `/api/register` | Inscription |
| GET | `/api/me` | Profil utilisateur courant |
| POST | `/api/forgot-password` | Réinitialisation du mot de passe |

### CRUD (API Platform - généré automatiquement)

| Ressource | Endpoint | Opérations |
|-----------|----------|-----------|
| Artistes | `/api/artists` | GET, POST, PUT, PATCH, DELETE |
| Œuvres | `/api/artworks` | GET, POST, PUT, PATCH, DELETE |
| Galeries | `/api/galleries` | GET, POST, PUT, PATCH, DELETE |
| Notes | `/api/ratings` | GET, POST, PUT, DELETE |
| Utilisateurs | `/api/users` | GET, POST, PUT, PATCH, DELETE |
| Médias | `/api/media_objects` | GET, POST |

### Administration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/dashboard` | Statistiques du tableau de bord |
| GET | `/api/admin/validations` | Liste des décisions de validation |
| POST | `/api/admin/validate/{type}/{id}` | Approuver/rejeter un contenu |
| GET | `/api/admin/artworks/detail/{id}` | Détail œuvre + statistiques |
| GET | `/api/admin/artists/detail/{id}` | Détail artiste + œuvres |

---

## Structure des projets

```
arthub-api/
├── config/                  # Configuration Symfony
├── migrations/              # Migrations Doctrine
├── src/
│   ├── Controller/Auth/     # Contrôleurs d'authentification
│   ├── Controller/Admin/    # Contrôleurs admin
│   ├── Entity/              # Entités Doctrine (modèle de données)
│   ├── Enum/                # Énumérations PHP
│   ├── EventListener/       # Listeners (JWT, activité)
│   ├── Repository/          # Repositories Doctrine
│   ├── Security/            # Authentificateurs, hashers
│   ├── Serializer/          # Normaliseurs personnalisés
│   ├── Service/             # Services métier
│   └── State/               # Processeurs API Platform
└── .env                     # Variables d'environnement

arthub-frontend/
├── public/assets/           # Images statiques
├── src/app/
│   ├── admin/               # Module admin (dashboard, CRUD)
│   ├── core/                # Auth, modèles, services, guards
│   ├── features/            # Modules fonctionnels (artworks, artists, etc.)
│   └── shared/              # Composants et pipes réutilisables
├── proxy.conf.json          # Proxy dev pour les uploads
├── tailwind.config.js       # Configuration Tailwind CSS
└── angular.json             # Configuration Angular
```
