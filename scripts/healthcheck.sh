#!/bin/bash

set -e

echo "🔍 Running health checks..."

# Check backend
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if curl -sf http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check database
if docker-compose exec -T mysql mysqladmin ping -h localhost > /dev/null 2>&1; then
    echo "✅ Database health check passed"
else
    echo "❌ Database health check failed"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis health check passed"
else
    echo "⚠️  Redis health check failed (non-critical)"
fi

echo "✅ All health checks passed!"
