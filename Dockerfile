# syntax=docker/dockerfile:1
# =====================================================
# 식재료LAB — Oracle Cloud ARM64 Deployment Dockerfile
# Rails API Backend + Static Frontend (Single Container)
# =====================================================

# Stage 1: Build
FROM ruby:3.3.7-slim AS build

WORKDIR /rails

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    libsqlite3-dev \
    pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment for gem install
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test"

# Install gems (cached layer)
COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

# Copy backend application code
COPY backend/ .

# Copy frontend files into Rails public directory
COPY frontend/index.html ./public/index.html
COPY frontend/app.js ./public/app.js
COPY frontend/style.css ./public/style.css
COPY frontend/manifest.json ./public/manifest.json
COPY frontend/sw.js ./public/sw.js

# Precompile bootsnap for faster boot
RUN bundle exec bootsnap precompile app/ lib/

# =====================================================
# Stage 2: Runtime (minimal)
# =====================================================
FROM ruby:3.3.7-slim

WORKDIR /rails

# Install runtime dependencies only
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    libsqlite3-0 \
    curl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application from build stage
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails

# Ensure directories exist with correct permissions
RUN mkdir -p storage tmp/pids tmp/cache log && \
    groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp public

# Production environment
ENV RAILS_ENV="production" \
    RAILS_SERVE_STATIC_FILES="true" \
    RAILS_LOG_TO_STDOUT="true" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test"

USER 1000:1000

# Health check — Kamal uses /up endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD curl -f http://localhost:3000/up || exit 1

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
