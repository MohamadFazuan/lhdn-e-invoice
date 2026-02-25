# Backend — Cloudflare Workers (local dev via Miniflare/wrangler dev)
# NOTE: Production deployment is `wrangler deploy` to Cloudflare, not Docker.
#       This image is intended for local development only.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 8787

# Bind to 0.0.0.0 so the port is reachable from the host / other containers.
# Requires .dev.vars to be mounted at /app/.dev.vars for secrets (see docker-compose.yml).
CMD ["npx", "wrangler", "dev", "--local", "--ip", "0.0.0.0", "--port", "8787"]
