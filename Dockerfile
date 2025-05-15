FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
RUN npx playwright install --with-deps

COPY index.js ./

EXPOSE 3000
CMD ["node", "index.js"]


