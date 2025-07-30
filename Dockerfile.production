# Production Dockerfile with comprehensive debugging
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    bash \
    curl

# Set working directory
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

# Copy package files first
COPY package*.json ./
COPY .npmrc* ./

# Log system information
RUN echo "========================================" > /app/logs/build.log && \
    echo "SYSTEM INFORMATION" >> /app/logs/build.log && \
    echo "========================================" >> /app/logs/build.log && \
    echo "Date: $(date)" >> /app/logs/build.log && \
    echo "Node version: $(node --version)" >> /app/logs/build.log && \
    echo "npm version: $(npm --version)" >> /app/logs/build.log && \
    echo "OS: $(uname -a)" >> /app/logs/build.log && \
    echo "" >> /app/logs/build.log

# Try npm install with detailed logging
RUN echo "========================================" >> /app/logs/build.log && \
    echo "NPM INSTALL ATTEMPT" >> /app/logs/build.log && \
    echo "========================================" >> /app/logs/build.log && \
    npm ci --verbose >> /app/logs/build.log 2>&1 || \
    (echo "npm ci failed, trying npm install..." >> /app/logs/build.log && \
     npm install --verbose >> /app/logs/build.log 2>&1) || \
    (echo "npm install failed, showing error details..." >> /app/logs/build.log && \
     cat /app/logs/build.log && \
     exit 1)

# Copy source code
COPY . .

# Build the application
RUN echo "========================================" >> /app/logs/build.log && \
    echo "BUILD ATTEMPT" >> /app/logs/build.log && \
    echo "========================================" >> /app/logs/build.log && \
    npm run build >> /app/logs/build.log 2>&1 || \
    (echo "Build failed, showing logs..." && cat /app/logs/build.log && exit 1)

# Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies
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