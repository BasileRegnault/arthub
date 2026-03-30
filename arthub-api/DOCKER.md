# Docker — Développement local

Le setup Docker pour le développement est défini dans `../docker-compose.dev.yml`.

## Services

| Conteneur | Rôle | Port |
|---|---|---|
| `arthub-php-dev` | PHP 8.3-FPM (Symfony) | — |
| `arthub-nginx-dev` | Nginx → reverse proxy vers PHP | **8000** |
| `arthub-db-dev` | PostgreSQL 16 | **5432** |
| `arthub-mailhog` | Capture des emails | **8025** |
| `arthub-frontend-dev` | Angular `ng serve` | **4200** |

Le code source est **monté en volume** : toute modification de fichier est immédiatement prise en compte, sans redémarrer le conteneur.

---

## Lancer le projet

Depuis le dossier parent `Symfony/` :

```bash
docker compose -f docker-compose.dev.yml up -d
```

---

## Premier lancement

```bash
# Installer les dépendances PHP
docker compose -f docker-compose.dev.yml exec php composer install

# Générer les clés JWT (config/jwt/)
docker compose -f docker-compose.dev.yml exec php php bin/console lexik:jwt:generate-keypair

# Appliquer les migrations
docker compose -f docker-compose.dev.yml exec php php bin/console doctrine:migrations:migrate --no-interaction
```

---

## Accès

| URL | Service |
|---|---|
| http://localhost:8000/api | API Symfony (Swagger UI) |
| http://localhost:4200 | Frontend Angular |
| http://localhost:8025 | Mailhog (emails capturés) |

---

## Commandes courantes

```bash
# Ouvrir un shell PHP
docker compose -f docker-compose.dev.yml exec php sh

# Vider le cache Symfony
docker compose -f docker-compose.dev.yml exec php php bin/console cache:clear

# Créer une migration après modification d'une entité
docker compose -f docker-compose.dev.yml exec php php bin/console doctrine:migrations:diff
docker compose -f docker-compose.dev.yml exec php php bin/console doctrine:migrations:migrate --no-interaction

# Charger les fixtures (données fictives)
docker compose -f docker-compose.dev.yml exec php php bin/console doctrine:fixtures:load --no-interaction

# Importer de vraies données (Art Institute of Chicago)
docker compose -f docker-compose.dev.yml exec php php bin/console app:import-art-data --limit=50

# Voir les logs en temps réel
docker compose -f docker-compose.dev.yml logs -f

# Stopper tous les services
docker compose -f docker-compose.dev.yml down
```

---

## Tests

Les tests utilisent une base de données séparée configurée dans `.env.test`.

```bash
# Préparer la base de test (une seule fois, en local sans Docker)
php bin/console doctrine:database:create --env=test
php bin/console doctrine:migrations:migrate --env=test --no-interaction

# Lancer tous les tests
vendor/bin/phpunit

# Un fichier spécifique
vendor/bin/phpunit tests/Functional/AuthTest.php
```

---

## CI/CD

Un workflow GitHub Actions (`.github/workflows/ci.yml`) s'exécute automatiquement à chaque push sur `main` ou `api` :

1. Démarre PostgreSQL 15 en service
2. Installe les dépendances Composer
3. Génère les clés JWT
4. Applique les migrations en env `test`
5. Lance `vendor/bin/phpunit`
