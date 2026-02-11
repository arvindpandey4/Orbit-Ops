# ---------- Builder Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (Railway root = backend)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# ---------- Production Stage ----------
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy app + node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
