#!/bin/bash

set -e

BACKUP_DIR="/var/backups/leave-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

mkdir -p "$BACKUP_PATH"

echo "📦 Creating backup at: $BACKUP_PATH"

# Backup database
docker-compose exec -T mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD leave_db > "${BACKUP_PATH}/database.sql"

# Backup environment files
cp .env "${BACKUP_PATH}/.env"
cp backend/.env "${BACKUP_PATH}/backend.env" 2>/dev/null || true

# Create archive
cd "$BACKUP_DIR"
tar -czf "backup_${TIMESTAMP}.tar.gz" "backup_${TIMESTAMP}"
rm -rf "backup_${TIMESTAMP}"

echo "✅ Backup created: backup_${TIMESTAMP}.tar.gz"
