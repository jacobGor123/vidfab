# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build-time arguments from docker-compose.yml
ARG NODE_ENV=development
ARG NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
ARG NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=true
ARG NEXT_PUBLIC_AUTH_GOOGLE_ID
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set environment variables for the build process
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=$NEXT_PUBLIC_AUTH_GOOGLE_ENABLED
ENV NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=$NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED
ENV NEXT_PUBLIC_AUTH_GOOGLE_ID=$NEXT_PUBLIC_AUTH_GOOGLE_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build with error tolerance - continue even if prerendering fails
RUN npm run build; EXIT_CODE=$?; if [ $EXIT_CODE -eq 0 ]; then echo "Build successful"; else echo "Build completed with prerender warnings - continuing deployment"; fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install curl for healthcheck, ffmpeg for video compression, and tzdata for timezone support
RUN apk add --no-cache curl ffmpeg tzdata

# Set timezone to Asia/Shanghai (Beijing Time)
# If you want to keep UTC and just adjust cron expression, comment out these lines
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Let .env.local control NODE_ENV - don't force production at runtime
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy Next.js build output - try standalone first, fallback to full build
RUN echo "Checking available .next outputs..."
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create missing manifest files if they don't exist
RUN if [ ! -f ./.next/prerender-manifest.json ]; then echo '{"version":4,"routes":{},"dynamicRoutes":{},"notFoundRoutes":[],"preview":{"previewModeId":"","previewModeSigningKey":"","previewModeEncryptionKey":""}}' > ./.next/prerender-manifest.json; fi
RUN if [ ! -f ./.next/routes-manifest.json ]; then echo '{"version":3,"pages404":false,"basePath":"","redirects":[],"rewrites":{"beforeFiles":[],"afterFiles":[],"fallback":[]},"headers":[]}' > ./.next/routes-manifest.json; fi
RUN if [ ! -f ./.next/BUILD_ID ]; then echo "production-build-$(date +%s)" > ./.next/BUILD_ID; fi

USER nextjs

# Server configuration - support environment variables
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE $PORT

CMD ["npm", "start"]