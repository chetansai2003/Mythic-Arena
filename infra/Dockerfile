FROM node:22.17.0-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-engine/package.json packages/game-engine/package.json
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/node_modules/.vite-temp && chown node:node /app/node_modules/.vite-temp
USER node
CMD ["npm", "start", "-w", "@mythic/api"]
