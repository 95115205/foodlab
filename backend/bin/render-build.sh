#!/usr/bin/env bash
# Render.com 빌드 스크립트
set -o errexit

echo "=== [1/4] Installing gems ==="
bundle install

echo "=== [2/4] Running database migrations ==="
bundle exec rails db:migrate 2>/dev/null || echo "No pending migrations"

echo "=== [3/4] Copying frontend files to public/ ==="
cp -f ../frontend/index.html ./public/index.html
cp -f ../frontend/app.js ./public/app.js
cp -f ../frontend/style.css ./public/style.css
cp -f ../frontend/manifest.json ./public/manifest.json
cp -f ../frontend/sw.js ./public/sw.js

echo "=== [4/4] Precompiling bootsnap ==="
bundle exec bootsnap precompile app/ lib/ 2>/dev/null || echo "Bootsnap precompile skipped"

echo "=== Build complete! ==="
