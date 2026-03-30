
---

# 🎨 ArtHub – Bibliothèque Numérique d'Œuvres d'Art

**ArtHub** est une plateforme web pour consulter, gérer et collectionner des œuvres d’art. Elle propose une API REST sécurisée permettant la création, la notation et l’organisation d’œuvres au sein de collections personnelles.  
Ce projet utilise **Symfony 7.3**, avec un focus sur les bonnes pratiques modernes : sécurité JWT, pagination, validation, Swagger, et Docker.

---

## 🚀 Fonctionnalités principales

### 👩‍🎨 Utilisateurs
- Authentification JWT (login/register)
- Rôles `USER` et `ADMIN`
- Création de collections personnelles
- Notation et commentaires sur les œuvres

### 🖼 Œuvres d’art
- 🔍 Recherche avec filtres dynamiques (type, style, époque, artiste…)
- ✅ **Pagination et tri personnalisés**
- CRUD complet pour les admins
- Upload d’images (local)

### 👨‍🎨 Artistes
- Biographie, dates, nationalité
- Liste des œuvres associées
- CRUD pour les admins

### 📚 Collections personnalisées
- Chaque utilisateur peut créer plusieurs collections
- Ajouter ou retirer des œuvres dans chaque collection

### ⭐ Notes & 💬 Commentaires
- Notation (1 à 5 étoiles) + commentaire texte
- Moyenne des évaluations visible pour chaque œuvre
- Commentaires publics modérés par un admin

---

## ⚙️ Stack technique

| Domaine         | Technologie                      |
|-----------------|----------------------------------|
| Langage         | PHP 8.3                          |
| Backend         | Symfony 7.3                    |
| ORM             | Doctrine      |
| Base de données | MySQL       |
| Stockage images | Local             |
| Tests           | PHP Unit |
| CI/CD           | GitHub Actions, Docker           |

---

## 🗂 Structure des entités

```text
User
 ├── id
 ├── username
 ├── email
 ├── password
 ├── role (USER/ADMIN)
 ├── profilePicture
 ├── createdAt
 ├── updatedAt

Artist
 ├── id
 ├── firstName
 ├── lastName  
 ├── bornAt, diedAt
 ├── nationality
 ├── biography
 ├── createdAt
 ├── updatedAt
 ├── profilePicture

Artwork
 ├── id
 ├── title
 ├── type (painting, sculpture, etc.)
 ├── style (impressionism, etc.)
 ├── creationDate
 ├── description
 ├── imageUrl
 ├── artist (ManyToOne)
 ├── location
 ├── isDisplay
 ├── createdAt
 ├── updatedAt


Gallery
 ├── id
 ├── name
 ├── description
 ├── owner (ManyToOne)
 ├── artworks (ManyToMany)
 ├── coverImage
 ├── isPublic
 ├── createdAt
 ├── updatedAt

Rating
 ├── id
 ├── score (1–5)
 ├── comment
 ├── author (ManyToOne)
 ├── artwork (ManyToOne)
````

---

## 🔐 Sécurité

* Authentification stateless avec JWT
* BCrypt pour le hash des mots de passe
* Règles d’accès :

| Endpoint              | Accès                    |
| --------------------- | ------------------------ |
| `/api/auth/**`        | Public                   |
| `/api/artworks`       | Lecture publique         |
|                       | Création/modif : `ADMIN` |
| `/api/users/**`       | Propriétaire ou `ADMIN`  |
| `/api/collections/**` | Utilisateur connecté     |

---

## 📦 Exemple d’API REST

### 🔐 Authentification

| Méthode | Endpoint             | Description                 | Rôle requis |
| ------- | -------------------- | --------------------------- | ----------- |
| POST    | `/api/auth/register` | Créer un compte utilisateur | Public      |
| POST    | `/api/auth/login`    | Obtenir un JWT              | Public      |

### 🖼 Œuvres

| Méthode | Endpoint                                     | Description                              | Rôle requis |
| ------- | -------------------------------------------- | ---------------------------------------- | ----------- |
| GET     | `/api/artworks`                              | Lister les œuvres (pagination + filtres) | Public      |
| GET     | `/api/artworks?page=0&size=10`               | Exemple de pagination                    | Public      |
| GET     | `/api/artworks?style=Baroque&type=sculpture` | Filtres dynamiques                       | Public      |
| GET     | `/api/artworks/artist/{artistId}`            | Obtenir toutes les œuvres d’un artiste   | Public      |
| POST    | `/api/artworks`                              | Ajouter une œuvre                        | ADMIN       |

### 👨‍🎨 Artistes

| Méthode | Endpoint            | Description          | Rôle requis |
| ------- | ------------------- | -------------------- | ----------- |
| GET     | `/api/artists/{id}` | Détails d’un artiste | Public      |
| POST    | `/api/artists`      | Ajouter un artiste   | ADMIN       |

### 📚 Collections

| Méthode | Endpoint           | Description                      | Rôle requis |
| ------- | ------------------ | -------------------------------- | ----------- |
| POST    | `/api/collections` | Créer une collection utilisateur | USER        |

### ⭐ Notes & 💬 Commentaires

| Méthode | Endpoint                           | Description                    | Rôle requis |
| ------- | ---------------------------------- | ------------------------------ | ----------- |
| POST    | `/api/ratings`                     | Ajouter une note + commentaire | USER        |
| GET     | `/api/ratings/artwork/{artworkId}` | Voir les commentaires          | Public      |

---

## 🔮 Fonctionnalités avancées

* ✅ Recherche dynamique (style, type, artiste, mots-clés)
* ✅ Pagination et tri personnalisés (titre, date, popularité)
* ✅ Affichage des œuvres d’un artiste spécifique
* ✅ Ajout de commentaires textuels liés à une note
* ✅ Expositions virtuelles temporaires
* ✅ Tags multiples pour chaque œuvre
* ✅ Suggestions automatiques : *« Vous aimerez aussi… »*
* ✅ Carte interactive des musées liés aux œuvres
* ✅ Export PDF d'une collection
* ✅ Authentification 2FA (email ou token)
* ✅ Modération des commentaires (ADMIN)

---

## 🐳 Docker & CI/CD

* `Dockerfile` pour builder l'application
* `docker-compose.yml` pour lancer PostgreSQL + l'API
* GitHub Actions :

  * Build + test automatique à chaque push

---

## 📁 Lancement rapide

### 🔨 Compilation et lancement

```bash
# Cloner le projet
git clone https://github.com/toncompte/arthub-api.git
cd arthub-api


php bin/console make:migration
php bin/console doctrine:database:drop --force
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php bin/console doctrine:fixtures:load
```

### 🌐 Accès API


## 👨‍💻 Auteur

Projet personnel réalisé par **Basile REGNAULT**
Utilisation libre pour le portfolio, démonstration technique ou amélioration continue.

