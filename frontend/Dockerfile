# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# npm 10 can fail strict peer resolution on some optional rolldown WASM peers.
# Keep deterministic lockfile installs while allowing peer fallback in CI/Docker.
RUN npm ci --legacy-peer-deps

COPY . .

# Build-time env vars (overridable via docker-compose build args)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
