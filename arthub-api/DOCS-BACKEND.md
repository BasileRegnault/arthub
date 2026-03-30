# ArtHub API - Documentation Backend

## Vue d'ensemble

API REST construite avec **Symfony 7.3** et **API Platform 4.2** pour la plateforme ArtHub. Fournit des endpoints CRUD auto-générés pour les ressources principales et des contrôleurs personnalisés pour l'authentification et l'administration.

---

## Stack technique

| Composant | Technologie | Version |
|-----------|------------|---------|
| Framework | Symfony | 7.3 |
| API | API Platform | 4.2 |
| ORM | Doctrine | 3.5 |
| Base de données | PostgreSQL | - |
| Authentification | Lexik JWT Bundle | 3.1 |
| Refresh token | Gesdinet JWT Refresh | 1.5 |
| Upload fichiers | Vich Uploader | 2.8 |
| CORS | Nelmio CORS | 2.6 |
| Emails | Symfony Mailer | 7.3 |

---

## Structure du projet

```
src/
├── Controller/
│   ├── Auth/
│   │   ├── EmailController.php       # Mot de passe oublié
│   │   ├── RegisterController.php    # Inscription
│   │   └── MeController.php          # GET /api/me
│   └── Admin/
│       ├── DashboardController.php   # Statistiques dashboard
│       ├── ValidateController.php    # Validation artistes/œuvres
│       ├── ValidationListController.php
│       ├── ArtworkDetailController.php
│       └── ArtistDetailController.php
├── Entity/
│   ├── User.php                      # Utilisateur (UserInterface)
│   ├── Artist.php                    # Artiste
│   ├── Artwork.php                   # Œuvre d'art
│   ├── Gallery.php                   # Galerie
│   ├── Rating.php                    # Note/commentaire
│   ├── MediaObject.php               # Fichier uploadé
│   ├── UserLoginLog.php              # Journal des connexions
│   ├── ActivityLog.php               # Journal des modifications
│   ├── ArtworkDailyView.php          # Vues quotidiennes œuvres
│   ├── GalleryDailyView.php          # Vues quotidiennes galeries
│   ├── ValidationDecision.php        # Décisions de validation
│   └── PasswordResetToken.php        # Tokens de réinitialisation
├── Enum/
│   ├── ArtworkType.php               # Painting, Sculpture, Drawing, Photography
│   ├── ArtworkStyle.php              # Impressionism, Realism, Cubism, Abstract
│   ├── AuthEvent.php                 # LOGIN_SUCCESS, LOGIN_FAILED, etc.
│   ├── ValidationStatus.php          # approved, rejected
│   └── ValidationSubjectType.php     # artist, artwork
├── EventListener/
│   ├── JWTLoginSuccessListener.php   # Log des connexions réussies
│   ├── JWTLoginFailureListener.php   # Log des échecs + rate limiting
│   └── DoctrineActivityListener.php  # Suivi des modifications (audit)
├── Security/
│   ├── OptionalJwtAuthenticator.php  # JWT optionnel sur /api
│   └── IpHasher.php                  # Hachage des IPs (RGPD)
├── Service/
│   └── DashboardService.php          # Requêtes statistiques dashboard
├── State/
│   └── ArtworkProcessor.php          # Logique métier création œuvre
├── Serializer/
│   └── MediaObjectNormalizer.php     # URLs des fichiers uploadés
└── Repository/                       # Repositories Doctrine
```

---

## Entités détaillées

### User

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | int | PK, auto-incrément |
| `username` | string(255) | Unique, min 3 caractères |
| `email` | string(180) | Unique, format email valide |
| `password` | string | Hash BCrypt |
| `roles` | json (JSONB) | Tableau, contient toujours ROLE_USER |
| `profilePicture` | ManyToOne MediaObject | Nullable |
| `isSuspended` | boolean | Par défaut : false |
| `createdAt` | DateTimeImmutable | Auto (PrePersist) |
| `updatedAt` | DateTimeImmutable | Auto (PreUpdate), nullable |

**Relations** : galleries[], ratings[], artworks[], artists[], userLoginLogs[], activityLogs[]
**Groupes de sérialisation** : `user:read`, `user:write`, `user:detail`

### Artist

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | int | PK |
| `firstname` | string(255) | Min 2 caractères |
| `lastname` | string(255) | Min 2 caractères |
| `bornAt` | DateTimeImmutable | Obligatoire, pas dans le futur |
| `diedAt` | DateTimeImmutable | Nullable, pas dans le futur |
| `nationality` | string(255) | Nullable |
| `biography` | text | Nullable |
| `profilePicture` | ManyToOne MediaObject | Nullable |
| `isConfirmCreate` | boolean | Validation admin |
| `toBeConfirmed` | boolean | En attente de validation |

**Relations** : artworks[], createdBy (User), updatedBy (User)
**Filtres** : firstname, lastname, nationality, createdBy, isConfirmCreate, toBeConfirmed, bornAt, diedAt, createdAt, updatedAt

### Artwork

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | int | PK |
| `title` | string(255) | Min 2 caractères |
| `type` | enum ArtworkType | Painting/Sculpture/Drawing/Photography |
| `style` | enum ArtworkStyle | Impressionism/Realism/Cubism/Abstract |
| `creationDate` | DateTimeImmutable | Pas dans le futur |
| `description` | text | Min 20 caractères |
| `image` | ManyToOne MediaObject | Nullable |
| `location` | string(255) | Nullable |
| `artist` | ManyToOne Artist | Obligatoire |
| `isDisplay` | boolean | Visible sur la plateforme |
| `isConfirmCreate` | boolean | Validé par admin |
| `toBeConfirmed` | boolean | En attente |
| `views` | int (transient) | Calculé depuis ArtworkDailyView |

**Relations** : artist, galleries[] (M2M), ratings[], createdBy, updatedBy
**Filtres** : title, type, style, location, artist, createdBy, isDisplay, isConfirmCreate, toBeConfirmed, creationDate, createdAt, updatedAt

### Gallery

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | int | PK |
| `name` | string(255) | Obligatoire |
| `description` | string(255) | Nullable |
| `coverImage` | ManyToOne MediaObject | Nullable |
| `isPublic` | boolean | Visible publiquement |
| `views` | int (transient) | Calculé depuis GalleryDailyView |

**Relations** : artworks[] (M2M), createdBy, updatedBy
**Filtres** : name, createdBy, isPublic, createdAt, updatedAt

### Rating

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | int | PK |
| `score` | float | 0 à 5, obligatoire |
| `comment` | text | Nullable |
| `artwork` | ManyToOne Artwork | Obligatoire |

**Relations** : artwork, createdBy, updatedBy

### MediaObject

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | PK |
| `file` | File (Vich) | Fichier uploadé |
| `filePath` | string | Chemin de stockage |
| `contentUrl` | string | URL publique |
| `createdAt` | DateTimeImmutable | Date d'upload |

**Types acceptés** : JPEG, PNG
**Taille max** : 15 Mo
**Upload** : `POST /api/media_objects` avec `Content-Type: multipart/form-data`

---

## Endpoints API

### Authentification

```
POST /api/login
  Body: { "email": "...", "password": "..." }
  Retourne: { "token": "jwt...", "refresh_token": "..." }

POST /api/register
  Body: { "email": "...", "username": "...", "password": "..." }
  Retourne: 201 { "message": "Utilisateur créé avec succès" }

GET /api/me
  Auth: Bearer token
  Retourne: Objet User (groupe user:read)

POST /api/forgot-password
  Body: { "email": "..." }
  Retourne: { "message": "Si un compte existe..." }
  Action: Génère un nouveau mot de passe et l'envoie par email

POST /api/token/refresh
  Body: { "refresh_token": "..." }
  Retourne: { "token": "nouveau_jwt...", "refresh_token": "..." }
```

### CRUD auto-généré (API Platform)

Chaque ressource supporte :
- `GET /api/{resource}` - Liste paginée (10 par défaut)
- `GET /api/{resource}/{id}` - Détail
- `POST /api/{resource}` - Création
- `PUT /api/{resource}/{id}` - Mise à jour complète
- `PATCH /api/{resource}/{id}` - Mise à jour partielle
- `DELETE /api/{resource}/{id}` - Suppression

| Ressource | Endpoint | Lecture | Écriture | Suppression |
|-----------|----------|---------|----------|-------------|
| Artists | `/api/artists` | Public | ROLE_USER | ROLE_ADMIN |
| Artworks | `/api/artworks` | Public | ROLE_USER | ROLE_ADMIN |
| Galleries | `/api/galleries` | Public | ROLE_USER | ROLE_ADMIN ou créateur |
| Ratings | `/api/ratings` | Public | ROLE_USER | Créateur ou ROLE_ADMIN |
| Users | `/api/users` | ROLE_ADMIN | ROLE_ADMIN ou propre profil | ROLE_ADMIN |
| MediaObjects | `/api/media_objects` | Public | Public | - |

**Pagination** : `?page=2&itemsPerPage=20`
**Tri** : `?order[title]=asc&order[createdAt]=desc`
**Filtres** : `?title=Sunset&style=Impressionism&isDisplay=true`

### Administration

```
GET /api/admin/dashboard
  Auth: ROLE_ADMIN
  Params: limitConnections, limitArtworks, limitAdminActions, daysConnections, monthsCharts
  Retourne: KPIs, graphiques, tables

POST /api/admin/validate/{type}/{id}
  Auth: ROLE_ADMIN
  type: "artist" | "artwork"
  Body: { "status": "approved|rejected", "reason": "..." }

GET /api/admin/validations
  Params: page, itemsPerPage, subjectType, subjectId
  Retourne: Liste paginée des décisions

GET /api/admin/artworks/detail/{id}
  Retourne: Détail œuvre + statistiques de vues + notes

GET /api/admin/artists/detail/{id}
  Retourne: Détail artiste + œuvres + logs d'activité
```

---

## Sécurité

### Configuration des firewalls

| Firewall | Pattern | Authentification |
|----------|---------|-----------------|
| `login` | `^/api/login` | JSON login (Lexik JWT) |
| `api` | `^/api` | OptionalJwtAuthenticator (JWT optionnel) |
| `main` | Tout le reste | Session standard |

### Rate limiting

- **Par IP** : 10 tentatives / 15 minutes
- **Par IP + username** : 10 tentatives / 15 minutes
- Réinitialisé après une connexion réussie

### Listeners d'événements

| Listener | Déclencheur | Action |
|----------|------------|--------|
| `JWTLoginSuccessListener` | Connexion réussie | Log UserLoginLog, reset rate limiter |
| `JWTLoginFailureListener` | Connexion échouée | Log UserLoginLog, incrémente rate limiter |
| `DoctrineActivityListener` | Toute modification Doctrine | Log ActivityLog (before/after) |

---

## ArtworkProcessor (logique métier)

Lors de la création d'une œuvre :
- **Utilisateur standard** : `isConfirmCreate = false`, `toBeConfirmed = true` (en attente de validation)
- **Administrateur** : `isConfirmCreate = true`, `toBeConfirmed = false` (publié directement)

---

## Service Dashboard

Le `DashboardService` fournit toutes les statistiques du tableau de bord admin :

| Méthode | Description |
|---------|-------------|
| `getKPIs()` | Nombre total utilisateurs, artistes, œuvres, notes, connexions (30j) |
| `getArtworksByMonth()` | Œuvres créées par mois (graphique ligne) |
| `getConnectionsByDay()` | Connexions par jour (graphique ligne) |
| `getArtworksDisplayedStats()` | Œuvres affichées vs masquées (graphique pie) |
| `getStylesStats()` | Répartition des styles artistiques (graphique doughnut) |
| `getNationalitiesStats()` | Répartition des nationalités d'artistes (graphique barre) |
| `getLatestConnections()` | Dernières connexions utilisateurs (table) |
| `getLatestArtworks()` | Dernières œuvres créées (table) |
| `getLatestAdminActions()` | Dernières actions admin (table) |
| `getTopArtworksByViews()` | Œuvres les plus vues |
| `getTopGalleriesByViews()` | Galeries les plus vues |
| `getPendingValidationsCounts()` | Nombre de validations en attente |

---

## Migrations

| Version | Date | Description |
|---------|------|-------------|
| `Version20260109012217` | 09/01/2026 | Création du schéma initial (toutes les tables) |
| `Version20260110003025` | 10/01/2026 | Ajout table `validation_decision` |
| `Version20260123175847` | 23/01/2026 | Ajout `gallery_daily_view`, suppression colonne `views` de gallery |

---

## Configuration

### Variables d'environnement (.env)

```bash
# Base de données
DATABASE_URL="pgsql://user:password@127.0.0.1:5432/arthub"

# JWT
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=votre_passphrase

# CORS
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'

# Mailer (Mailtrap pour le dev)
MAILER_DSN=smtp://USERNAME:PASSWORD@sandbox.smtp.mailtrap.io:2525
```

### API Platform (config/packages/api_platform.yaml)

- Pagination par défaut : 10 éléments
- Pagination configurable par le client : activée
- Formats : JSON-LD, multipart/form-data, JSON
- Opérations stateless
