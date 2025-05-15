FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps || npm install --force
RUN npx playwright install --with-deps

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
