# Railway-Optimized Dockerfile for Next.js 15.3.1 with Multi-tenant SaaS
# This Dockerfile is specifically designed to work reliably on Railway's infrastructure

# Multi-stage build for optimal performance and size
FROM node:20-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with specific Railway optimizations
RUN npm ci --only=production --no-audit --no-fund --prefer-offline --maxsockets 1 && \
    npm cache clean --force

# Stage 2: Build dependencies (includes devDependencies)
FROM base AS builder

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --no-audit --no-fund --prefer-offline --maxsockets 1

# Copy source code
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN npm run build

# Stage 3: Production runtime
FROM base AS runner

# Set runtime environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Create nextjs user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create necessary directories with proper permissions
RUN mkdir -p .next/cache && \
    chown -R nextjs:nodejs .next && \
    chmod -R 755 .next

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]