# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set production node environment
ENV NODE_ENV=production

# Copy built node_modules and code files
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Use built-in non-root user
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
