# Stage 1 -- dependencies only. Copying the manifests before the source means
# this layer is reused whenever only the source changed, which is almost always.
FROM node:24-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prepare the writable data directory while we still have normal Linux tools.
RUN mkdir -p /data \
    && chown 65532:0 /data \
    && chmod 0755 /data


# Stage 2 -- runtime. Distroless: no shell, no package manager, no apt.
FROM gcr.io/distroless/nodejs24-debian13

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/campus-notes.db

COPY --from=deps --chown=65532:0 /app/node_modules ./node_modules

COPY --chown=65532:0 src ./src
COPY --chown=65532:0 public ./public
COPY --chown=65532:0 seed ./seed

# Copy the prepared writable directory into the runtime image.
COPY --from=deps --chown=65532:0 /data /data

USER 65532

EXPOSE 3000

# Distroless has no curl or shell, so use Node.js itself for the health check.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["src/server.js"]