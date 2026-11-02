FROM node:26.13.0-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install --global corepack && corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:26.13.0-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist

EXPOSE 8080

CMD ["node", "server-dist/server/index.js"]
