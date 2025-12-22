#!/bin/bash
# Build script for Vercel deployments
# Runs migrations before building the app

set -e

echo "Running database migrations..."
npm run db:migrate

echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"
