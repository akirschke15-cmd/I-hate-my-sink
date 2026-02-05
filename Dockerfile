# ============================================
# IHMS Backend - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/api/package.json ./packages/api/
COPY server/package.json ./server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 ihms

# Set production environment
ENV NODE_ENV=production
ENV PORT=3011

# Copy built application
COPY --from=builder --chown=ihms:nodejs /app/package.json ./
COPY --from=builder --chown=ihms:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=ihms:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=ihms:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=ihms:nodejs /app/packages/api/dist ./packages/api/dist

# Copy production dependencies only
COPY --from=deps --chown=ihms:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=ihms:nodejs /app/server/node_modules ./server/node_modules
COPY --from=deps --chown=ihms:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps --chown=ihms:nodejs /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps --chown=ihms:nodejs /app/packages/api/node_modules ./packages/api/node_modules

# Switch to non-root user
USER ihms

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3011/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
