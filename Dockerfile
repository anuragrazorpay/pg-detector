FROM node:18-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
COPY package.json ./
RUN npm ci
RUN npx playwright install --with-deps
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
