# Use the official Node.js image as base
FROM node:20-bookworm-slim

# Install system dependencies required for Playwright/Chromium
# This avoids installing full browsers globally and just installs dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && npx playwright install-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Install exactly the Chromium browser playwright needs
RUN npx playwright install chromium

# Copy application code
COPY . .

# Ensure data directory exists for local SQLite
RUN mkdir -p data
RUN chmod 777 data

# Expose server port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
