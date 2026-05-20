FROM node:20-bullseye-slim

# Install dependencies needed by puppeteer
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libnss3 \
  libx11-6 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libgbm1 \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*;

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV PORT 3000
EXPOSE 3000
CMD ["node", "server.js"]
