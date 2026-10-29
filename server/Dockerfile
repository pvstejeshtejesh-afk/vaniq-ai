# Vaniq.Ai backend image
FROM node:20-alpine
WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
