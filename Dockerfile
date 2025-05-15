# Use Playwright base image
FROM mcr.microsoft.com/playwright:v1.52.0-jammy

# Set working directory
WORKDIR /app

# Install deps
COPY package.json ./
RUN npm install --legacy-peer-deps
RUN npx playwright install --with-deps

# Copy source
COPY . .

# Expose API
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
