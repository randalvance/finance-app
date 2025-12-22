#!/bin/bash
# Build script for Vercel deployments

set -e

# Only run migrations on production deployments
# Skip for preview/development to avoid conflicts
echo "VERCEL_ENV is set to: $VERCEL_ENV"
if [ "$VERCEL_ENV" != "production" ]; then
  echo "Non-production environment detected - skipping migrations"
else
  echo "Production deployment - running database migrations..."
  npm run db:migrate
fi

echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"
