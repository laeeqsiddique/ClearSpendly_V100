# Production Dockerfile with error debugging
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc* ./

# Debug: Show package.json contents
RUN echo "=== PACKAGE.JSON CONTENTS ===" && \
    cat package.json && \
    echo "=== END PACKAGE.JSON ==="

# Debug: Show system info
RUN echo "=== SYSTEM INFO ===" && \
    node --version && \
    npm --version && \
    echo "=== END SYSTEM INFO ==="

# Try npm install with immediate output (not to file)
RUN npm ci --verbose || \
    (echo "=== NPM CI FAILED, TRYING NPM INSTALL ===" && \
     npm install --verbose) || \
    (echo "=== BOTH NPM COMMANDS FAILED ===" && \
     npm config list && \
     ls -la && \
     exit 1)

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nextjs:nodejs /app/server.js ./server.js

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]