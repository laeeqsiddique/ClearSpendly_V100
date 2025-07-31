# Fix component path resolution issues
FROM node:20-alpine AS base

# Install ALL required system dependencies for canvas
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    bash \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconfig \
    build-base

# Set working directory
WORKDIR /app

# Copy ALL source files first (needed for path resolution)
COPY . .

# Install dependencies (this needs source files for proper resolution)
RUN npm ci

# Set build-time flag
ENV BUILDING=true

# Build the application with environment variables
# Railway will inject these at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG RAILWAY_ENVIRONMENT

# Pass environment variables to the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV RAILWAY_ENVIRONMENT=$RAILWAY_ENVIRONMENT

# Log environment variables for debugging
RUN echo "Building with environment variables:" && \
    echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..." && \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..." && \
    echo "RAILWAY_ENVIRONMENT: $RAILWAY_ENVIRONMENT"

RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    libc6-compat \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]