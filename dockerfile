FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest (but ignore node_modules via .dockerignore)
COPY . .

# OPTIONAL: prevent cache-lock issues forever
RUN npm config set cache /tmp/.npm-cache --global

# Build the project
RUN npm run build

# Production start command
CMD ["npm", "start"]
