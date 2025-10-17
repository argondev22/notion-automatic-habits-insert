FROM node:20-bullseye AS development

ENV NODE_ENV=development

# ログのタイムスタンプを日本時間するためタイムゾーンを指定
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# セキュリティのため非rootユーザーを作成
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY ./package*.json ./
COPY ./tsconfig.json ./

RUN npm ci --include=dev && npm cache clean --force

COPY ./src ./src

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["npm", "run", "dev"]


FROM node:20-bullseye AS builder

WORKDIR /app

COPY ./package*.json ./
COPY ./tsconfig.json ./

RUN npm ci --include=dev && npm cache clean --force

COPY ./src ./src

RUN npm run build


FROM node:20-bullseye-slim AS production

ENV NODE_ENV=production

ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN groupadd -r appuser && useradd -r -g appuser appuser

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "./dist/main.js"]
