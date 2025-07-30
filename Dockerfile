# Production-ready Dockerfile for Railway deployment
# Optimized for Next.js 15.3.1 with comprehensive error handling

# Stage 1: Base dependencies
FROM node:20-alpine AS base

# Install system dependencies required by native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
    curl \
    bash \
    # Required for canvas
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    # Required for puppeteer
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ttf-freefont

# Set up npm configuration for better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-timeout 300000 && \
    npm config set cache-min 3600 && \
    npm config set prefer-offline true && \
    npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false

# Stage 2: Dependencies installation with enhanced error handling
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean npm cache and create fresh lockfile if needed
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json

# Install dependencies with multiple fallback strategies
RUN npm install --verbose --no-audit --no-fund --legacy-peer-deps || \
    (echo "First install attempt failed, retrying with force..." && \
     npm install --force --verbose --no-audit --no-fund) || \
    (echo "Force install failed, trying with ignore-scripts..." && \
     npm install --ignore-scripts --verbose --no-audit --no-fund --legacy-peer-deps && \
     npm rebuild) || \
    (echo "All npm install attempts failed" && exit 1)

# Verify critical dependencies are installed
RUN node -e "require('next'); require('react'); require('react-dom'); console.log('Core deps verified')" || \
    (echo "Core dependencies missing" && exit 1)

# Stage 3: Builder with production optimizations
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV SKIP_ENV_VALIDATION=1

# Create production build with error handling
RUN echo "Starting Next.js build..." && \
    npm run build || \
    (echo "Build failed, checking for common issues..." && \
     ls -la .next || echo "No .next directory created" && \
     cat .next/build-manifest.json 2>/dev/null || echo "No build manifest" && \
     exit 1)

# Verify build output
RUN test -d .next && test -f .next/BUILD_ID || \
    (echo "Build verification failed" && exit 1)

# Stage 4: Production runner with minimal footprint
FROM node:20-alpine AS runner

# Install only runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    # For puppeteer runtime
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont

# Create app directory and user
WORKDIR /app

# Create non-root user with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy additional required files
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Set up Puppeteer for serverless environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Configure runtime environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })" || exit 1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application with proper error handling
CMD ["node", "server.js"]