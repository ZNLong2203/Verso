# ── Phụ thuộc ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Chạy ─────────────────────────────────────────────────────
# Khoá Gemini truyền lúc CHẠY (--set-env-vars), không nhúng vào image.
# Firestore không cần khoá: Cloud Run dùng danh tính sẵn có của dịch vụ.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# output:'standalone' KHÔNG gộp .next/static và public/ — phải chép riêng,
# nếu không thì CSS và ảnh sẽ 404 trên production.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
