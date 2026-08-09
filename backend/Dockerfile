# Build from the repo root, not from backend/, since risk-kb.json lives one level up
# from this Dockerfile at kb/risk-kb.json and Docker can't COPY paths outside the
# build context:
#
#   docker build -f backend/Dockerfile -t policyquote-backend .
#
# (run from QuotePolicyAssesment/, i.e. the repo root)

# ---- deps: full install (incl. devDependencies), needed to compile TypeScript ----
FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# ---- build: compile src/ -> dist/ ----
FROM deps AS build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ---- prod-deps: separate, production-only install (kept out of the final image
#      otherwise; devDependencies like typescript/jest/ts-node never end up in it) ----
FROM node:22-alpine AS prod-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: minimal final image actually shipped to Fargate ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# kbLoader.ts resolves risk-kb.json via `__dirname + '../../kb/risk-kb.json'`, relative
# to the compiled backend/dist/kbLoader.js — mirror the repo's own directory layout here
# (kb/ two levels above backend/dist/) rather than special-casing the container's paths.
COPY kb ./kb
COPY --from=prod-deps /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

ENV PORT=3000
EXPOSE 3000

# ECS/Fargate task + ALB target group health checks both hit this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
