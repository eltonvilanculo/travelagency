FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install \
  && npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -f .env || touch .env
RUN npx prisma generate \
  && npm run build

FROM base AS production-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --omit=dev \
  && npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/src/lib/database-url.ts ./src/lib/database-url.ts
COPY --from=builder /app/.env ./.env

# Next/Image writes optimized images to this directory at runtime. The image
# is built as root, but the app runs as `nextjs`, so make the runtime cache
# writable before dropping privileges.
RUN mkdir -p /app/.next/cache/images \
  && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "if [ -z \"${DATABASE_URL:-}\" ] && [ -f ./.env ]; then set -a; . ./.env; set +a; fi; test -n \"${DATABASE_URL:-}\" || { echo 'DATABASE_URL is required. Set it in .env or pass it at runtime.'; exit 1; }; case \"$DATABASE_URL\" in postgresql://*|postgres://*) ;; *) echo 'DATABASE_URL must start with postgresql:// or postgres://'; exit 1 ;; esac; export DATABASE_URL; ./node_modules/.bin/prisma migrate deploy && npm run start"]
