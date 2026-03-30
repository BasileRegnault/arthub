# ============================================
# Dockerfile — ArtHub Frontend (Angular + Nginx)
# ============================================

# --- Étape 1 : Build Angular ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Argument pour l'URL de l'API (injectée au build)
ARG API_BASE_URL=http://localhost:8000
RUN sed -i "s|http://localhost:8000|${API_BASE_URL}|g" src/app/environments/environment.ts \
    && sed -i "s|production: false|production: true|g" src/app/environments/environment.ts

RUN npx ng build --configuration=production

# --- Étape 2 : Serveur Nginx ---
FROM nginx:alpine

# Supprimer la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular
COPY --from=builder /app/dist/arthub-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
