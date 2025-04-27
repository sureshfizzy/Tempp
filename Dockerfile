FROM node:20-alpine as builder

WORKDIR /app

# Install necessary build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package.json files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Clean dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Install runtime dependencies
RUN apk add --no-cache dumb-init tzdata

# Create a non-root user
RUN addgroup -g 1000 jellyfin && \
    adduser -D -u 1000 -G jellyfin jellyfin

# Copy entrypoint script
COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Copy application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./

# Set proper permissions 
RUN mkdir -p /app/config /app/data && \
    chown -R jellyfin:jellyfin /app

# Expose ports
EXPOSE 5000

# Set volumes
VOLUME ["/app/config", "/app/data"]

# Switch to non-root user
USER jellyfin

# Start application using dumb-init as PID 1
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dumb-init", "node", "dist/server/index.js"]