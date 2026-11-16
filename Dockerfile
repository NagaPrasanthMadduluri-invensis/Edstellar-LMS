# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js client, using standalone output.

# ---- builder ---------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# NEXT_PUBLIC_* is inlined at BUILD time, so the API origin must be present now
# (next.config.mjs throws otherwise). SERVER_API_URL is the internal proxy
# target baked into the rewrites manifest; it falls back to the public URL.
ARG NEXT_PUBLIC_SERVER_URL
ARG SERVER_API_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV SERVER_API_URL=${SERVER_API_URL}

COPY . .
# --no-lint matches the harness client-build: the eslint config is unused here
# and build-time linting would fail for reasons unrelated to the build.
RUN npx next build --no-lint

# ---- runtime: slim standalone server, non-root -----------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# The standalone output bundles a minimal server + node_modules; static assets
# and public/ are copied beside it as Next expects.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
