# syntax=docker/dockerfile:1

# ---- build ------------------------------------------------------------------
# Pinned to a digest-free but explicit minor so rebuilds are reproducible enough
# for a static site while still receiving patch fixes.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first: this layer is cached until the lockfile actually changes.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
# BASE_PATH lets the same image serve from a sub-path (reverse proxy, Pages).
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
RUN npm run build

# ---- runtime ----------------------------------------------------------------
# nginx-unprivileged listens on 8080 as a non-root user, so the container needs
# no capabilities and can run read-only under a restrictive PodSecurity policy.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="Abacus" \
      org.opencontainers.image.description="Software estimation in man-days: complexity ladders, PERT ranges, scenarios." \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.source="https://github.com/syalioune/abacus-estimator"

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
