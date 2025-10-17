FROM node:20-bullseye AS development

ENV NODE_ENV=development

# ログのタイムスタンプを日本時間するためタイムゾーンを指定
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

EXPOSE 8080

CMD ["npm", "run", "dev"]


FROM node:20-bullseye AS builder

ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY tsconfig.json ./
COPY package*.json ./

RUN npm install --include=dev

COPY ./src ./src

RUN npm run build


FROM node:20-bullseye-slim AS production

ENV NODE_ENV=production

ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

CMD ["node", "./dist/main.js"]
