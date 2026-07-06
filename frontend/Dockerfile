# syntax=docker/dockerfile:1

# ---------- Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Backend URL cho lúc build (chỉ ảnh hưởng file được prerender tĩnh; runtime đọc lại qua env).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8090
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

# ---------- Runtime (Next.js standalone output) ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system meridian && adduser --system --ingroup meridian meridian

COPY --from=build --chown=meridian:meridian /app/.next/standalone ./
COPY --from=build --chown=meridian:meridian /app/.next/static ./.next/static
COPY --from=build --chown=meridian:meridian /app/public ./public

USER meridian
EXPOSE 3100
ENV PORT=3100 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
