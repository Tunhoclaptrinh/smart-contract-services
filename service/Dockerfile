# syntax=docker/dockerfile:1.7
# One image per service. Build from the repository root:
#   docker build -f service/Dockerfile -t sc/<service> .
ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable
WORKDIR /app

# Workspace manifests first so dependency layers stay cached until a manifest changes.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/nest-common/package.json packages/nest-common/
COPY service/package.json service/

FROM manifests AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY packages/nest-common packages/nest-common
COPY service service
RUN pnpm --filter @sc/nest-common build && pnpm --filter "{./service}" build

# Production dependencies of the service and of the chassis it uses. "{./service}..." selects by
# directory, so a service repository can rename its package without touching this file.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "{./service}..."

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000 \
    REPO_ROOT=/app \
    DATA_DIR=/data \
    TRUST_DIR=/data/trust
WORKDIR /app
# The production install as pnpm laid it out: root and per-package node_modules with their symlinks.
COPY --from=deps /app ./
COPY --from=build /app/packages/nest-common/dist ./packages/nest-common/dist
COPY packages/nest-common/package.json ./packages/nest-common/
COPY --from=build /app/service/dist ./service/dist
COPY service/package.json ./service/
# Runtime files the service reads relative to REPO_ROOT: resource definitions and the permission matrix.
COPY packages/contracts/resources.json packages/contracts/permissions.json ./packages/contracts/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "service/dist/main.js"]
