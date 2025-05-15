FROM mcr.microsoft.com/playwright:v1.42.0-jammy

WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.js ./

EXPOSE 3000
CMD ["node", "index.js"]

