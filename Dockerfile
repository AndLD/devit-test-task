# syntax=docker/dockerfile:1

# Pinned to the same version as .nvmrc — see AGENTS.md/README for why this
# project needs Node ^20.19/^22.12/>=24 (Prisma 7's tooling).
ARG NODE_VERSION=22.21.1

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime image: only what next.config.ts's `output: "standalone"` actually
# needs (no node_modules, no source tree) — see the "migrate" service in
# docker-compose.yml for the separate image that runs `prisma migrate
# deploy`/seed, which does need the full builder stage.
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
