FROM node:22.17.0-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY backend/src/workers/package.json backend/src/workers/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY backend/src/services/gameEngine/package.json backend/src/services/gameEngine/package.json
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/node_modules/.vite-temp && chown node:node /app/node_modules/.vite-temp
USER node
CMD ["npm", "start", "-w", "@mythic/api"]
