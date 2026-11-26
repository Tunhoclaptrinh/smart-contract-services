# syntax=docker/dockerfile:1.7
# The API gateway image. Build from the repository root (branch main):
#   docker build -f gateway/Dockerfile -t sc/gateway .
ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /app

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/nest-common/package.json packages/nest-common/
COPY gateway/package.json gateway/

FROM manifests AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter "{./gateway}..."
COPY packages/nest-common packages/nest-common
COPY gateway gateway
RUN pnpm --filter @sc/nest-common build && pnpm --filter "{./gateway}" build

FROM manifests AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "{./gateway}..."

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production GATEWAY_HOST=0.0.0.0 GATEWAY_PORT=3000 REPO_ROOT=/app
WORKDIR /app
COPY --from=deps /app ./
COPY --from=build /app/packages/nest-common/dist ./packages/nest-common/dist
COPY packages/nest-common/package.json ./packages/nest-common/
COPY --from=build /app/gateway/dist ./gateway/dist
COPY gateway/package.json gateway/routes.json ./gateway/
# The chassis reads the permission matrix when it builds an actor from a token.
COPY packages/contracts/resources.json packages/contracts/permissions.json ./packages/contracts/
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.GATEWAY_PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "gateway/dist/main.js"]
