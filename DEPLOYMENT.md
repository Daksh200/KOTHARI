# Furnish POS — Production Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy the Furnish POS system to production on AWS, Azure, or self-hosted environments.

## Pre-Deployment Checklist

- [ ] Database backups configured
- [ ] Environment variables secured (JWT_SECRET, DATABASE_URL)
- [ ] SSL/TLS certificates obtained
- [ ] Authentication & authorization tested
- [ ] All API endpoints tested locally
- [ ] Database migrations verified
- [ ] Logging & monitoring configured
- [ ] Rate limiting enabled
- [ ] CORS policies configured
- [ ] Secrets manager set up

---

## Phase 1: Environment Setup

### 1.1 Production Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL="postgresql://prod_user:STRONG_PASSWORD@db.production.com:5432/billing_db_prod?schema=public&sslmode=require"

# Authentication
JWT_SECRET="generate-a-64-character-random-string-here-min-64-chars-for-hs256"
JWT_EXPIRE="7d"

# App
NEXT_PUBLIC_API_URL="https://api.furnish-pos.com"
NODE_ENV="production"

# Monitoring
SENTRY_DSN="https://YOUR_KEY@sentry.io/PROJECT_ID"
LOG_LEVEL="error"
```

**Generate secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Secure Secrets Storage

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name furnish-pos/prod \
  --secret-string '{
    "JWT_SECRET":"...",
    "DB_PASSWORD":"..."
  }'
```

**Retrieve in application:**
```typescript
// app/lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export async function getSecret(name: string) {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const command = new GetSecretValueCommand({ SecretId: "furnish-pos/prod" });
  const response = await client.send(command);
  return JSON.parse(response.SecretString || "{}")[name];
}
```

---

## Phase 2: Database Setup (PostgreSQL)

### 2.1 Create Production Database

```sql
-- Connect as superuser
CREATE USER billing_app WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE billing_db_prod OWNER billing_app;

-- Grant permissions
GRANT CONNECT ON DATABASE billing_db_prod TO billing_app;
GRANT USAGE ON SCHEMA public TO billing_app;
GRANT CREATE ON SCHEMA public TO billing_app;

-- Connect to new database and create tables
\c billing_db_prod

-- Run all Prisma migrations
-- From your local machine:
```

```bash
DATABASE_URL="postgresql://billing_app:PASSWORD@production-db:5432/billing_db_prod?schema=public" \
npx prisma migrate deploy
```

### 2.2 Database Backup Strategy

**AWS RDS Automated Backups:**
```bash
aws rds modify-db-instance \
  --db-instance-identifier billing-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --enabled-cloudwatch-logs-exports postgresql
```

**Manual Backup:**
```bash
pg_dump -h production-db -U billing_app -d billing_db_prod \
  -F c > billing_db_$(date +%Y%m%d).dump
```

---

## Phase 3: Frontend Build & Deployment

### 3.1 Build Next.js Application

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build production bundle
npm run build

# Verify build
npm run start
```

### 3.2 Deploy to AWS Vercel (Recommended for Next.js)

**Via Vercel CLI:**
```bash
npm install -g vercel
vercel --prod

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - JWT_SECRET
# - NEXT_PUBLIC_API_URL
```

**Via AWS CloudFront + S3 + Lambda:**
```bash
# Build static export
npm run build
npm run export

# Upload to S3
aws s3 sync out/ s3://furnish-pos-prod --delete

# Create CloudFront distribution
# - Origin: S3 bucket
# - Cache policy: Managed-CachingOptimized
# - Custom domain via Route 53
```

### 3.3 Deploy to Azure App Service

```bash
# Install Azure CLI
npm install -g @azure/cli

# Login
az login

# Create app service
az appservice plan create \
  --name furnish-pos-plan \
  --resource-group furnish-pos \
  --sku B2

# Deploy
az webapp create \
  --resource-group furnish-pos \
  --plan furnish-pos-plan \
  --name furnish-pos-app \
  --runtime "node|18"

# Set environment variables
az webapp config appsettings set \
  --resource-group furnish-pos \
  --name furnish-pos-app \
  --settings DATABASE_URL="..." JWT_SECRET="..."
```

---

## Phase 4: API Server Setup

### 4.1 Docker Containerization (Recommended)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "run", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://billing_app:password@db:5432/billing_db_prod"
      JWT_SECRET: "${JWT_SECRET}"
      NEXT_PUBLIC_API_URL: "https://api.furnish-pos.com"
      NODE_ENV: "production"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: billing_app
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
      POSTGRES_DB: billing_db_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 4.2 Build & Push Docker Image

```bash
# Build
docker build -t furnish-pos:latest .

# Tag for registry
docker tag furnish-pos:latest myregistry.azurecr.io/furnish-pos:latest

# Push to Azure Container Registry
az acr login --name myregistry
docker push myregistry.azurecr.io/furnish-pos:latest
```

---

## Phase 5: Reverse Proxy & Load Balancing

### 5.1 Nginx Configuration

Create `nginx.conf`:

```nginx
upstream app {
  server furnish-pos-app:3000;
  keepalive 64;
}

server {
  listen 80;
  server_name api.furnish-pos.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.furnish-pos.com;

  ssl_certificate /etc/letsencrypt/live/api.furnish-pos.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.furnish-pos.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  client_max_body_size 10M;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req zone=api burst=20 nodelay;

  # API routes
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    proxy_connect_timeout 5s;
  }

  # Static files (if any)
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    proxy_pass http://app;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # Health check endpoint
  location /health {
    access_log off;
    proxy_pass http://app;
  }
}
```

### 5.2 Certbot SSL Certificate

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d api.furnish-pos.com

# Auto-renew
sudo systemctl enable certbot.timer
```

---

## Phase 6: Monitoring & Logging

### 6.1 Application Health Monitoring

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

### 6.2 Sentry Error Tracking

Install Sentry:

```bash
npm install @sentry/next
```

Configure `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/next";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Replay({ maskAllText: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 6.3 Structured Logging

```bash
npm install winston
```

Create `app/lib/logger.ts`:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: '/var/log/furnish-pos/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/var/log/furnish-pos/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

---

## Phase 7: Database Connection Pooling

### 7.1 PgBouncer Configuration

Install PgBouncer:

```bash
sudo apt-get install pgbouncer
```

Configure `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
billing_db_prod = host=db.production.com port=5432 dbname=billing_db_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_lifetime = 3600
server_idle_timeout = 600
```

Update `DATABASE_URL`:

```
postgresql://billing_app:PASSWORD@localhost:6432/billing_db_prod?schema=public
```

---

## Phase 8: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npm run build
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Phase 9: Backup & Disaster Recovery

### 9.1 Database Backup Schedule

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups/furnish-pos"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="db.production.com"
DB_USER="billing_app"
DB_NAME="billing_db_prod"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c \
  -f "$BACKUP_DIR/backup_$DATE.dump"

# Keep only last 30 days backups
find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete

# Upload to S3
aws s3 cp "$BACKUP_DIR/backup_$DATE.dump" \
  s3://furnish-pos-backups/production/

echo "Backup completed: $DATE"
```

Schedule with cron:

```bash
0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### 9.2 Restore Procedure

```bash
# Restore from backup
pg_restore -h db.production.com -U billing_app -d billing_db_prod \
  /backups/furnish-pos/backup_YYYYMMDD_HHMMSS.dump
```

---

## Phase 10: Security Hardening

### 10.1 PostgreSQL Security

```sql
-- Disable public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO billing_app;

-- Create read-only user for backups
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE billing_db_prod TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 10.2 API Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});
```

### 10.3 CORS Configuration

```typescript
// app/api/middleware.ts
const corsOptions = {
  origin: ['https://furnish-pos.com', 'https://app.furnish-pos.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
```

---

## Phase 11: Performance Optimization

### 11.1 Database Query Optimization

```sql
-- Add indexes for frequent queries
CREATE INDEX idx_invoice_created_at ON Invoice(createdAt DESC);
CREATE INDEX idx_invoice_customer_id ON Invoice(customerId);
CREATE INDEX idx_inventory_product_location ON InventoryItem(productId, location);
CREATE INDEX idx_inventory_tx_created_at ON InventoryTransaction(createdAt DESC);

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM Invoice WHERE createdAt > NOW() - INTERVAL '7 days';
```

### 11.2 Redis Caching

```bash
npm install redis
```

```typescript
// app/lib/cache.ts
import { createClient } from 'redis';

const redis = createClient({
  host: 'redis.production.com',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

export async function getCachedProduct(productId: number) {
  const cached = await redis.get(`product:${productId}`);
  if (cached) return JSON.parse(cached);
  
  const product = await prisma.product.findUnique({ where: { id: productId } });
  await redis.setEx(`product:${productId}`, 3600, JSON.stringify(product));
  return product;
}
```

---

## Phase 12: Post-Deployment Verification

### Checklist:

- [ ] Health endpoint responds (/api/health)
- [ ] Login works with test user credentials
- [ ] Invoice creation works end-to-end
- [ ] PDF generation works
- [ ] Database backups running
- [ ] SSL certificate valid
- [ ] Rate limiting active
- [ ] Logging captures errors
- [ ] Monitoring alerts configured
- [ ] Disaster recovery plan tested

---

## Support & Maintenance

**Production Support Contacts:**
- Database Admin: db-admin@company.com
- DevOps: devops@company.com
- On-call: 24/7 pager

**Weekly Tasks:**
- Review error logs in Sentry
- Check database performance
- Verify backup integrity
- Update dependencies (security patches)

**Monthly Tasks:**
- Database optimization (VACUUM, ANALYZE)
- Review performance metrics
- Update SSL certificates
- Audit user access logs

---

**Last Updated:** Feb 2026

