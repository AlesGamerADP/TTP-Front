FROM node:20-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_OUTPUT_MODE=standalone
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG INTERNAL_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
ENV NEXT_OUTPUT_MODE=$NEXT_OUTPUT_MODE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ENCRYPTION_KEY=$NEXT_PUBLIC_ENCRYPTION_KEY

COPY ingetec-front/package*.json ./ingetec-front/
COPY packages/shared/package.json ./packages/shared/package.json

WORKDIR /app/ingetec-front
RUN apk add --no-cache libc6-compat && npm ci --ignore-scripts

WORKDIR /app
COPY packages/shared ./packages/shared
COPY ingetec-front ./ingetec-front

WORKDIR /app/ingetec-front
RUN npm run build --prefix ../packages/shared && node scripts/sync-shared-build.js && npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/ingetec-front/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/ingetec-front/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/ingetec-front/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/login', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)})"

CMD ["node", "server.js"]
