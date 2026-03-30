# ArtHub Frontend - Documentation

## Vue d'ensemble

Application Angular pour la plateforme ArtHub. Interface publique pour les visiteurs/utilisateurs et panneau d'administration complet pour les administrateurs. Communique avec l'API Symfony via des endpoints REST JSON-LD/Hydra.

---

## Stack technique

| Composant | Technologie | Version |
|-----------|------------|---------|
| Framework | Angular | 20.3 |
| Langage | TypeScript | 5.9 |
| Styles | TailwindCSS | 4.1 |
| Graphiques | Chart.js | 4.5 |
| Réactivité | RxJS | 7.8 |
| Build | Angular CLI | 20.3 |

---

## Structure du projet

```
arthub-frontend/
├── src/
│   ├── app/
│   │   ├── admin/                        # Zone d'administration
│   │   │   ├── dashboard/                # Tableau de bord (KPI, graphiques, tables)
│   │   │   ├── layout/                   # Layout admin
│   │   │   │   ├── admin-layout.component.ts
│   │   │   │   ├── sidebar/              # Barre latérale de navigation
│   │   │   │   └── topbar/               # Barre supérieure (breadcrumb, utilisateur)
│   │   │   └── pages/
│   │   │       ├── artists/              # CRUD artistes (liste, formulaire, détail, filtre)
│   │   │       ├── artworks/             # CRUD œuvres (liste, formulaire, détail, filtre)
│   │   │       ├── galleries/            # CRUD galeries (liste, formulaire, détail, filtre)
│   │   │       ├── users/                # Utilisateurs (liste, détail, filtre)
│   │   │       └── validations/          # Validation artistes et œuvres
│   │   ├── core/
│   │   │   ├── auth/                     # AuthService + intercepteur JWT
│   │   │   ├── guards/                   # authGuard, adminGuard
│   │   │   ├── models/                   # Interfaces TypeScript
│   │   │   ├── services/                 # Services API
│   │   │   └── utils/                    # Helpers Hydra
│   │   ├── features/                     # Pages publiques
│   │   │   ├── artworks/                 # Liste, détail, création
│   │   │   ├── artists/                  # Liste, détail, création
│   │   │   ├── auth/                     # Connexion, inscription, mot de passe oublié
│   │   │   ├── galleries/               # Publiques, mes galeries, détail
│   │   │   ├── home/                     # Page d'accueil
│   │   │   ├── layout/                   # Header/Footer client
│   │   │   ├── map/                      # Carte interactive
│   │   │   ├── ratings/                  # Mes notes
│   │   │   └── users/                    # Profil, édition
│   │   └── shared/
│   │       ├── components/               # Composants réutilisables
│   │       └── pipes/                    # Pipes personnalisés
│   ├── environments/                     # Configuration par environnement
│   └── styles.scss                       # Styles globaux (Tailwind)
├── public/assets/                        # Fichiers statiques
├── proxy.conf.json                       # Proxy dev pour uploads
├── tailwind.config.js                    # Thème Tailwind personnalisé
├── tsconfig.json                         # Configuration TypeScript
└── package.json
```

---

## Modèles de données

### User

```typescript
interface User {
  '@id'?: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
  profilePicture?: MediaObject;
  galleries?: Gallery[] | string[];
  ratings?: Rating[] | string[];
  isSuspended: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

### Artist

```typescript
interface Artist {
  '@id'?: string;
  id: number;
  firstname: string;
  lastname: string;
  bornAt: string;
  diedAt?: string | null;
  nationality?: string | null;
  biography?: string | null;
  profilePicture?: MediaObject;
  isConfirmCreate: boolean;
  toBeConfirmed: boolean;
  artworks?: Artwork[] | string[];
  createdBy?: User | string;
  updatedBy?: User | string;
  createdAt?: string;
  updatedAt?: string;
}
```

### Artwork

```typescript
interface Artwork {
  '@id'?: string;
  id: number;
  title: string;
  type: ArtworkType;      // Painting | Sculpture | Drawing | Photography
  style: ArtworkStyle;    // Impressionism | Realism | Cubism | Abstract
  creationDate: string;
  description: string;
  image?: MediaObject;
  location?: string | null;
  artist: Artist;
  views?: number | null;
  isDisplay: boolean;
  isConfirmCreate: boolean;
  toBeConfirmed: boolean;
  galleries?: Gallery[] | string[];
  ratings?: Rating[] | string[];
  createdBy?: User | string;
  updatedBy?: User | string;
  createdAt?: string;
  updatedAt?: string;
}
```

### Gallery

```typescript
interface Gallery {
  '@id'?: string;
  id?: number;
  name: string;
  description?: string | null;
  coverImage?: MediaObject;
  views?: number | null;
  isPublic: boolean;
  createdBy?: User | string;
  updatedBy?: User | string;
  artworks?: Artwork[] | string[];
  createdAt?: string;
  updatedAt?: string;
}
```

### Rating

```typescript
interface Rating {
  '@id'?: string;
  id?: number;
  score: number;           // 0 à 5
  comment?: string | null;
  createdBy?: User | string;
  artwork: Artwork | string;
  createdAt?: string;
  updatedAt?: string;
}
```

### Énumérations

```typescript
enum ArtworkType {
  PAINTING = 'Painting',
  SCULPTURE = 'Sculpture',
  DRAWING = 'Drawing',
  PHOTOGRAPHY = 'Photography'
}

enum ArtworkStyle {
  IMPRESSIONISM = 'Impressionism',
  REALISM = 'Realism',
  CUBISM = 'Cubism',
  ABSTRACT = 'Abstract'
}

enum UserRole {
  ADMIN = 'ROLE_ADMIN',
  USER = 'ROLE_USER'
}
```

---

## Routing

### Routes principales

| Chemin | Composant | Guard | Description |
|--------|-----------|-------|-------------|
| `/` | HomeComponent | - | Page d'accueil |
| `/artworks` | ArtworksListComponent | - | Liste des œuvres |
| `/artworks/create` | ArtworkCreateComponent | authGuard | Créer une œuvre |
| `/artworks/:id` | ArtworkDetailComponent | - | Détail d'une œuvre |
| `/artists` | ArtistsListComponent | - | Liste des artistes |
| `/artists/create` | ArtistCreateComponent | authGuard | Créer un artiste |
| `/artists/:id` | ArtistDetailComponent | - | Détail d'un artiste |
| `/galleries` | PublicGalleriesComponent | - | Galeries publiques |
| `/galleries/my-galleries` | MyGalleriesComponent | authGuard | Mes galeries |
| `/galleries/user/:userId` | UserGalleriesComponent | - | Galeries d'un utilisateur |
| `/galleries/:id` | GalleryDetailComponent | - | Détail d'une galerie |
| `/map` | WorldMapComponent | - | Carte interactive |
| `/ratings/my-ratings` | MyRatingsComponent | - | Mes notes |
| `/profile` | ProfileComponent | authGuard | Mon profil |
| `/profile/edit` | EditProfileComponent | authGuard | Modifier mon profil |
| `/my-submissions` | MySubmissionsComponent | authGuard | Mes soumissions en attente |

### Routes d'authentification

| Chemin | Composant | Description |
|--------|-----------|-------------|
| `/auth/login` | LoginComponent | Connexion |
| `/auth/register` | RegisterComponent | Inscription |
| `/auth/forgot-password` | ForgotPasswordComponent | Mot de passe oublié |

### Routes d'administration

| Chemin | Composant | Guard | Description |
|--------|-----------|-------|-------------|
| `/admin` | AdminDashboardComponent | adminGuard | Tableau de bord |
| `/admin/artworks` | ArtworkListComponent | adminGuard | Liste des œuvres |
| `/admin/artworks/new` | ArtworkFormComponent | adminGuard | Nouvelle œuvre |
| `/admin/artworks/:id` | ArtworkDetailComponent | adminGuard | Détail œuvre |
| `/admin/artworks/edit/:id` | ArtworkFormComponent | adminGuard | Modifier œuvre |
| `/admin/galleries` | GalleryListComponent | adminGuard | Liste des galeries |
| `/admin/galleries/new` | GalleryFormComponent | adminGuard | Nouvelle galerie |
| `/admin/galleries/:id` | GalleryDetailComponent | adminGuard | Détail galerie |
| `/admin/galleries/edit/:id` | GalleryFormComponent | adminGuard | Modifier galerie |
| `/admin/artists` | ArtistListComponent | adminGuard | Liste des artistes |
| `/admin/artists/new` | ArtistFormComponent | adminGuard | Nouvel artiste |
| `/admin/artists/:id` | ArtistDetailComponent | adminGuard | Détail artiste |
| `/admin/artists/edit/:id` | ArtistFormComponent | adminGuard | Modifier artiste |
| `/admin/users` | UserListComponent | adminGuard | Liste des utilisateurs |
| `/admin/users/:id` | UserDetailComponent | adminGuard | Détail utilisateur |
| `/admin/validations/artists` | ValidationArtistHomeComponent | adminGuard | Validation artistes |
| `/admin/validations/artworks` | ValidationArtworkHomeComponent | adminGuard | Validation œuvres |

---

## Services

### ApiPlatformService (générique)

Service générique pour communiquer avec API Platform. Gère automatiquement les collections Hydra et la pagination.

| Méthode | Description |
|---------|-------------|
| `list(endpoint, page, itemsPerPage, filters)` | Liste paginée avec filtres |
| `getAll(endpoint, params)` | Tous les éléments sans pagination |
| `get(endpoint, id, params)` | Élément par ID |
| `create(endpoint, data)` | Création |
| `update(endpoint, id, data)` | Mise à jour complète (PUT) |
| `patch(endpoint, id, data)` | Mise à jour partielle (PATCH) |
| `delete(endpoint, id)` | Suppression |
| `createFormData(file)` | Upload média (POST multipart) |

### AuthService

Gestion de l'authentification JWT, état utilisateur réactif avec signals.

| Méthode | Description |
|---------|-------------|
| `login(email, password)` | Connexion, stocke les tokens |
| `register(email, username, password)` | Inscription + auto-login |
| `logout()` | Déconnexion, supprime les tokens |
| `refreshToken()` | Rafraîchit le JWT |
| `loadCurrentUser()` | Charge l'utilisateur depuis `/api/me` (caché) |
| `isAuthenticated()` | Vérifie si connecté |
| `isAdmin()` | Vérifie si ROLE_ADMIN |
| `hasRole(role)` | Vérifie un rôle spécifique |
| `getCurrentUserAsync()` | Retourne l'utilisateur (Promise) pour les guards |

**Mode dev bypass** : `environment.devBypassAuth = true` simule un admin connecté sans backend.

### GalleryService

| Méthode | Description |
|---------|-------------|
| `getUserGalleries(userId, page, itemsPerPage)` | Galeries d'un utilisateur |
| `getPublicGalleries(page, itemsPerPage, filters)` | Galeries publiques |
| `toggleVisibility(galleryId, isPublic)` | Basculer publique/privée |
| `getGallery(galleryId)` | Détail d'une galerie |
| `createGallery(data)` | Créer une galerie |
| `updateGallery(galleryId, data)` | Modifier une galerie |
| `deleteGallery(galleryId)` | Supprimer une galerie |

### RatingService

| Méthode | Description |
|---------|-------------|
| `rateArtwork(artworkId, score, comment)` | Créer une note |
| `getUserRating(artworkId)` | Note de l'utilisateur pour une œuvre |
| `updateRating(ratingId, score, comment)` | Modifier une note |
| `deleteRating(ratingId)` | Supprimer une note |
| `getArtworkRatings(artworkId, page, itemsPerPage)` | Notes d'une œuvre |
| `getUserRatings(userId, page, itemsPerPage)` | Notes d'un utilisateur |

### CountryService

Récupère les pays depuis l'API REST Countries avec cache et fallback.

| Méthode | Description |
|---------|-------------|
| `getCountries()` | Tous les pays (caché) |
| `searchCountries(query)` | Rechercher par nom |
| `getCountryByCode(code)` | Par code ISO |
| `getCountryByName(name)` | Par nom |

### FormErrorHandlerService

Parse les erreurs de validation API Platform et les attache aux contrôles Angular.

| Méthode | Description |
|---------|-------------|
| `handleApiError(error, form)` | Attache les erreurs au formulaire |
| `parseApiError(error)` | Parse la structure d'erreur |
| `clearServerErrors(form)` | Supprime les erreurs serveur |

Formats supportés : violations Hydra, erreurs HTTP génériques, erreurs par champ et globales.

### ConstraintErrorHandlerService

Détecte les erreurs de contrainte de clé étrangère et charge les entités liées.

| Méthode | Description |
|---------|-------------|
| `isConstraintError(error)` | Détecte une violation de contrainte |
| `loadArtistRelatedEntities(id)` | Œuvres de l'artiste |
| `loadArtworkRelatedEntities(id)` | Galeries contenant l'œuvre |
| `loadUserRelatedEntities(id)` | Galeries et notes de l'utilisateur |
| `loadGalleryRelatedEntities(id)` | Œuvres de la galerie |

### BreadcrumbService

Génère automatiquement les breadcrumbs depuis les données de route Angular (`data.breadcrumb`).

### ValidationRefreshService

Bus d'événements simple pour rafraîchir les compteurs de validation dans la sidebar admin.

---

## Guards

### authGuard

- Vérifie que l'utilisateur est connecté (token présent)
- Charge l'utilisateur si pas encore chargé
- Redirige vers `/auth/login` avec `returnUrl` si non connecté

### adminGuard

- Hérite du comportement de authGuard
- Vérifie en plus que l'utilisateur a le rôle `ROLE_ADMIN`
- Redirige vers `/` si pas admin

---

## Intercepteur JWT

Le `jwtInterceptor` est un `HttpInterceptorFn` qui :

1. **Ignore** les routes `/login`, `/register`, `/token/refresh`
2. **Attache** le token Bearer si l'utilisateur est authentifié
3. **Rafraîchit** automatiquement le token sur erreur 401
4. **Rejoue** la requête échouée avec le nouveau token
5. **Limite** à une seule tentative de refresh pour éviter les boucles

---

## Composants partagés

### Composants de formulaire

| Composant | Description |
|-----------|-------------|
| `AppFormFieldComponent` | Champ de formulaire avec gestion d'erreurs automatique |
| `AppArtistAutocompleteComponent` | Autocomplétion d'artistes (ControlValueAccessor) |
| `AppUserAutocompleteComponent` | Autocomplétion d'utilisateurs |
| `AppCountryAutocompleteComponent` | Autocomplétion de pays (API REST Countries) |
| `AppArtworkSelectorComponent` | Sélection multiple d'œuvres avec vignettes |
| `BooleanToggleComponent` | Bascule 3 états (Tous/Vrai/Faux) pour filtres |
| `DateRangeInputComponent` | Saisie plage de dates (Du/Au) avec FormGroup |

### Composants d'affichage

| Composant | Description |
|-----------|-------------|
| `KpiCardComponent` | Carte KPI réutilisable (icône, label, valeur) |
| `PaginationComponent` | Pagination intelligente avec ellipsis |
| `SearchBarComponent` | Barre de recherche avec debounce (300ms) |
| `StarRatingComponent` | Affichage/saisie de notes (1-5 étoiles) |
| `ArtworkCardComponent` | Carte d'œuvre avec image et note moyenne |
| `GalleryCardComponent` | Carte de galerie avec image de couverture |
| `BreadcrumbComponent` | Fil d'Ariane automatique |

### Composants modaux

| Composant | Description |
|-----------|-------------|
| `ConfirmModalComponent` | Dialogue de confirmation générique |
| `RelatedEntitiesModalComponent` | Affiche les entités liées empêchant la suppression |
| `ValidationReasonModalComponent` | Saisie de raison pour validation/rejet |
| `GlobalErrorAlertComponent` | Affichage d'erreurs API |
| `DetailActionsComponent` | Actions standard (Modifier/Supprimer/Voir) |

---

## Pipes

| Pipe | Description | Exemple |
|------|-------------|---------|
| `dateDisplay` | Formate une date ISO | `"2026-01-15T10:30:00"` → `"15/01/2026 - 10:30"` |
| `resourceId` | Extrait l'ID d'un IRI | `"/api/users/12"` → `"12"` |
| `resourceLabel` | Extrait un libellé d'une ressource | `{ username: "Jean" }` → `"Jean"` |

---

## Layouts

### Layout Client

```
┌──────────────────────────────────┐
│         Header (navigation)      │
├──────────────────────────────────┤
│                                  │
│        <router-outlet>           │
│     (contenu des pages)          │
│                                  │
├──────────────────────────────────┤
│         Footer                   │
└──────────────────────────────────┘
```

- Détection du scroll pour styliser le header
- Layout flex pleine hauteur

### Layout Admin

```
┌────────────┬─────────────────────┐
│            │       Topbar        │
│  Sidebar   ├─────────────────────┤
│            │                     │
│  - Dashboard                     │
│  - Œuvres  │   <router-outlet>   │
│  - Galeries│                     │
│  - Artistes│                     │
│  - Users   │                     │
│  - Valid.  │                     │
│            │                     │
└────────────┴─────────────────────┘
```

- Sidebar repliable (état persisté dans localStorage)
- Topbar avec breadcrumb, bouton retour, menu utilisateur
- Compteurs de validations en attente dans la sidebar

---

## Tableau de bord admin

### KPI (cartes)

| KPI | Description |
|-----|-------------|
| Total œuvres | Nombre total d'œuvres |
| Total artistes | Nombre total d'artistes |
| Total galeries | Nombre total de galeries |
| Total utilisateurs | Nombre total d'utilisateurs |

### Graphiques (Chart.js)

| Graphique | Type | Description |
|-----------|------|-------------|
| Œuvres par mois | Ligne | Œuvres créées par mois |
| Connexions par jour | Ligne | Connexions quotidiennes |
| Affichées vs masquées | Doughnut | Répartition œuvres visibles/cachées |
| Styles artistiques | Pie | Répartition des styles |
| Nationalités | Barre horizontale | Top nationalités des artistes |

### Tables

| Table | Description |
|-------|-------------|
| Dernières connexions | Journal des connexions récentes |
| Dernières œuvres | Œuvres récemment créées |
| Actions admin | Dernières actions d'administration |

---

## Filtres admin

Chaque page de liste admin possède un composant de filtre avec :

- **Filtres texte** : nom, prénom, titre, email...
- **Filtres date** : plages de dates (créé entre, modifié entre, né entre...)
- **Filtres booléen** : confirmation, affichage, suspension, visibilité
- **Filtres relationnels** : créateur (autocomplétion utilisateur), artiste (autocomplétion)
- **Persistance URL** : les filtres sont stockés dans les query params pour le partage/historique

Les composants partagés `DateRangeInputComponent` et `BooleanToggleComponent` sont utilisés dans tous les filtres.

---

## Gestion des erreurs

### Erreurs de formulaire

Le `FormErrorHandlerService` parse automatiquement les erreurs de validation Hydra :

```json
{
  "hydra:description": "...",
  "violations": [
    { "propertyPath": "title", "message": "Le titre est trop court" }
  ]
}
```

Les erreurs sont attachées directement aux contrôles Angular correspondants.

### Erreurs de contrainte (suppression)

Le `ConstraintErrorHandlerService` détecte les erreurs de clé étrangère et affiche un modal avec les entités liées empêchant la suppression.

### Erreurs d'authentification

L'intercepteur JWT gère automatiquement le refresh du token sur erreur 401.

---

## Configuration

### Environnement (environment.ts)

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
  apiUrl: 'http://localhost:8000/api',
  devBypassAuth: false
};
```

### Proxy (proxy.conf.json)

Redirige les requêtes `/uploads` vers le backend Symfony pour servir les fichiers uploadés en développement.

```json
{
  "/uploads": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

### Tailwind (tailwind.config.js)

Thème personnalisé avec :
- Couleurs `primary` (slate) et `accent` (stone)
- Police `Inter`
- Ombres artistiques (`artistic`, `artistic-lg`)
- Gradients personnalisés (`artistic-gradient`, `subtle-gradient`)

---

## Commandes

```bash
# Installation
npm install

# Développement
ng serve                                    # Port 4200
ng serve --proxy-config proxy.conf.json     # Avec proxy uploads

# Build
ng build                                    # Production
ng build --configuration development        # Développement

# Tests
ng test                                     # Tests unitaires (Karma/Jasmine)
```

---

## Conventions du projet

- **Composants standalone** : tous les composants utilisent `standalone: true`
- **Signals Angular** : `signal()`, `computed()`, `input()`, `output()`, `effect()`
- **Lazy loading** : toutes les routes de features sont chargées à la demande
- **Commentaires en français** dans tout le code
- **TailwindCSS** pour le style, pas de fichiers SCSS dédiés par composant (inline ou template)
- **API Platform IRI** : les relations utilisent des IRIs (`/api/users/12`) ou des objets complets
- **Hydra** : les collections sont parsées via `PaginatedResult<T>` avec support de la pagination
