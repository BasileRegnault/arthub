# ============================================
# Dockerfile — ArtHub API (Symfony + PHP-FPM)
# ============================================

# --- Étape 1 : Installation des dépendances ---
FROM php:8.3-fpm-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    icu-dev \
    libzip-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        intl \
        zip \
        gd \
        opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

COPY . .
RUN mkdir -p var/cache var/log && chmod -R 775 var/

# --- Étape 2 : Image finale ---
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    icu-dev \
    libzip-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        intl \
        zip \
        gd \
        opcache

# Configuration PHP optimisée pour la production
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "upload_max_filesize=10M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size=12M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit=256M" >> /usr/local/etc/php/conf.d/memory.ini \
    && echo "date.timezone=Europe/Paris" >> /usr/local/etc/php/conf.d/timezone.ini

WORKDIR /app

COPY --from=builder /app /app

# Fichier .env minimal requis par Symfony au démarrage
# Les vraies valeurs sont injectées via docker-compose (variables d'environnement)
RUN echo "APP_ENV=prod" > /app/.env && echo "APP_DEBUG=0" >> /app/.env

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p public/uploads/artworks config/jwt \
    && chown -R www-data:www-data var/ public/uploads/ config/jwt/

EXPOSE 9000

USER www-data

CMD ["php-fpm"]
