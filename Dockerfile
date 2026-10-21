# ─────────────────────────────────────────────────────────────────────────────
#  WhatsApp Core Engine — Multi-Stage Dockerfile
#  Stage 1: deps      → install node_modules
#  Stage 2: builder   → compile TypeScript
#  Stage 3: development → hot-reload dev server
#  Stage 4: production  → minimal runtime image
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && cp -R node_modules /tmp/prod_modules
RUN npm ci

# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache wget curl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Create ephemeral session directory (never persisted to disk)
RUN mkdir -p /tmp/wa-sessions && chmod 700 /tmp/wa-sessions
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget curl dumb-init libstdc++
COPY --from=builder /app/dist ./dist
COPY --from=deps /tmp/prod_modules ./node_modules
# Create persistent and ephemeral data directories and run as non-root
ARG DOCKER_GID=999
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs \
    && (addgroup -g ${DOCKER_GID} -S docker 2>/dev/null || true) \
    && (addgroup nestjs docker 2>/dev/null || true) \
    && mkdir -p /app/data/sessions /app/data/media /tmp/wa-sessions \
    && chown -R nestjs:nodejs /app/data /tmp/wa-sessions \
    && chmod 700 /tmp/wa-sessions /app/data/sessions
USER nestjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
