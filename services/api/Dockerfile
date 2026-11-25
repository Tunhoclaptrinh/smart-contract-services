# syntax=docker/dockerfile:1.7
# One image per service. Build from the repository root:
#   docker build -f services/api/Dockerfile -t btl/api .
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
COPY services/api/package.json services/api/

FROM manifests AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY services/api services/api
RUN pnpm --filter @codecash/api build

# Production dependencies only; pnpm's relative symlinks survive the copy below.
FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @codecash/api

FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000 \
    REPO_ROOT=/app \
    DATA_DIR=/data \
    TRUST_DIR=/data/trust
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/api/node_modules ./services/api/node_modules
COPY --from=build /app/services/api/dist ./services/api/dist
COPY services/api/package.json ./services/api/
# Runtime files the API reads relative to REPO_ROOT: resource definitions and the permission matrix.
COPY packages/contracts/resources.json packages/contracts/permissions.json ./packages/contracts/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "services/api/dist/main.js"]
