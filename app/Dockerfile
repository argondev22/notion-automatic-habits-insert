FROM node:25-bullseye AS development

ENV NODE_ENV=development

# ログのタイムスタンプを日本時間するためタイムゾーンを指定
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# セキュリティのため非rootユーザーを作成
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./jest.config.js ./

RUN npm ci --include=dev && npm cache clean --force

COPY ./src ./src
COPY ./config ./config

RUN chown -R appuser:appuser /app
USER appuser

CMD ["npm", "start"]


FROM node:25-bullseye AS builder

WORKDIR /app

COPY ./package*.json ./
COPY ./tsconfig.json ./

RUN npm ci --include=dev && npm cache clean --force

COPY ./src ./src

RUN npm run build


FROM node:25-bullseye-slim AS production

ENV NODE_ENV=production

ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY ./package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY ./config ./config

RUN chown -R appuser:appuser /app
USER appuser

CMD ["node", "./dist/main.js"]
