# Production Readiness Checklist

## Security & Secrets

- [ ] **JWT_SECRET** changed to 64-char random string (production environment)
- [ ] **DATABASE_URL** uses SSL mode (`sslmode=require`)
- [ ] **Secrets stored** in cloud provider (AWS Secrets Manager / Azure Key Vault)
- [ ] **.env.production** NOT committed to git
- [ ] **CORS** configured to allow only production domain
- [ ] **Rate limiting** enabled on auth endpoints
- [ ] **HTTPS/TLS 1.2+** enforced
- [ ] **SQL injection prevention**: All queries use parameterized statements (Prisma ORM)
- [ ] **XSS protection**: Content Security Policy headers set
- [ ] **Authentication middleware** applied to all protected endpoints
- [ ] **Session timeout** configured (JWT_EXPIRE="7d")
- [ ] **Password requirements** enforced (8+ chars, uppercase, lowercase, digit)

## Database

- [ ] **PostgreSQL 14+** installed and running
- [ ] **Connection pooling** configured (PgBouncer or AWS RDS proxy)
- [ ] **Backups enabled** (daily automated, 30-day retention)
- [ ] **Backup tested** (restore process verified)
- [ ] **SSL connections** required (`sslmode=require`)
- [ ] **Row-level security** configured (if multi-tenant)
- [ ] **All migrations applied** (`npx prisma migrate deploy`)
- [ ] **Indexes created** for high-traffic queries
- [ ] **Database user permissions** restricted (billing_app user with minimal grants)
- [ ] **Public schema access revoked** from PUBLIC
- [ ] **pg_stat_statements** enabled for query monitoring
- [ ] **Logical replication** enabled (for read replicas)

## Application

- [ ] **Next.js built** (`npm run build` completes without errors)
- [ ] **Prisma client generated** (`npx prisma generate`)
- [ ] **Environment variables** all set in production
- [ ] **No console.log** statements in production code (use structured logging)
- [ ] **Error boundaries** implemented in React
- [ ] **Health check endpoint** responds (/api/health)
- [ ] **Graceful shutdown** handling implemented
- [ ] **Memory leaks** checked (node --inspect, take heap snapshots)
- [ ] **Dependencies up-to-date** (no known vulnerabilities)

## API Endpoints

- [ ] **POST /api/auth/login** — Works with valid credentials
- [ ] **POST /api/auth/login** — Rejects invalid credentials
- [ ] **POST /api/auth/verify** — Validates JWT token
- [ ] **POST /api/auth/logout** — Logs logout event
- [ ] **POST /api/invoices/finalize** — Creates invoice with atomic transaction
- [ ] **GET /api/invoices/[id]/pdf** — Returns PDF file
- [ ] **POST /api/returns/create** — Processes returns with refund
- [ ] **Error responses** return appropriate HTTP status codes
- [ ] **Request validation** prevents malformed data
- [ ] **Rate limiting** returns 429 when exceeded
- [ ] **Authentication required** for all protected endpoints
- [ ] **Audit logs** captured for all transactions

## Deployment Infrastructure

- [ ] **Docker image** built and pushed to registry
- [ ] **Reverse proxy** (Nginx) configured with SSL
- [ ] **Load balancer** configured (if multiple instances)
- [ ] **Auto-scaling** policies set
- [ ] **Health checks** configured for instances
- [ ] **Rolling deployments** tested
- [ ] **Zero-downtime deployments** possible
- [ ] **Rollback procedure** documented

## Monitoring & Observability

- [ ] **Sentry** configured for error tracking
- [ ] **CloudWatch / Application Insights** logging enabled
- [ ] **Metrics** collected (response times, request counts, error rates)
- [ ] **Alerts** configured for critical errors
- [ ] **Uptime monitoring** enabled (Pingdom, Datadog, etc.)
- [ ] **Database performance** monitored (slow queries, connections)
- [ ] **Storage consumption** monitored
- [ ] **Log aggregation** centralized (ELK, Splunk, CloudWatch Logs)
- [ ] **Distributed tracing** enabled (Jaeger, Datadog APM)

## Testing

- [ ] **Unit tests pass** (`npm test` or similar)
- [ ] **API integration tests** pass with production database
- [ ] **Login flow tested** end-to-end
- [ ] **Invoice creation tested** with multiple payment modes
- [ ] **Invoice PDF download** tested
- [ ] **Thermal printer ESC/POS output** tested (if thermal printer available)
- [ ] **Return flow tested** with refund calculation
- [ ] **Concurrent operations tested** (no race conditions)
- [ ] **Stress testing** performed (load testing)
- [ ] **Security scanning** (OWASP Top 10)

## Documentation

- [ ] **ARCHITECTURE.md** updated with production details
- [ ] **DEPLOYMENT.md** completed with all phases
- [ ] **API documentation** available (Swagger/OpenAPI)
- [ ] **Database schema diagram** documented
- [ ] **Disaster recovery plan** documented
- [ ] **Runbook for common issues** created
- [ ] **Change log** maintained
- [ ] **On-call procedures** documented

## Rollback Plan

- [ ] **Database rollback** procedure documented (restore from backup)
- [ ] **Application rollback** procedure documented (revert to previous image/version)
- [ ] **DNS failover** configured (if applicable)
- [ ] **Backup servers** available
- [ ] **Recovery time objective (RTO)** defined (target: < 30 min)
- [ ] **Recovery point objective (RPO)** defined (target: < 1 hour)

## Compliance & Audit

- [ ] **GST compliance** verified (tax calculations accurate)
- [ ] **Invoice numbering** sequential and immutable
- [ ] **Audit logs** complete (who, what, when, where)
- [ ] **Data retention** policy defined
- [ ] **Privacy policy** displayed to users
- [ ] **Terms of service** displayed to users
- [ ] **GDPR compliance** verified (if applicable)
- [ ] **PCI-DSS** compliance verified (if handling card data)

## Performance

- [ ] **First contentful paint** < 2 seconds
- [ ] **Database query** average < 100ms
- [ ] **API response time** median < 200ms
- [ ] **Largest Contentful Paint** < 4 seconds
- [ ] **Cumulative Layout Shift** < 0.1
- [ ] **99th percentile latency** < 1000ms
- [ ] **Error rate** < 0.1%

## Before Go-Live

- [ ] **Load test passed** (at least 1000 concurrent users)
- [ ] **Smoke tests passed** on production environment
- [ ] **All stakeholders notified** of go-live date/time
- [ ] **Support team trained** on POS system
- [ ] **Incident response plan** in place
- [ ] **Communication channels** established (Slack, PagerDuty)
- [ ] **Maintenance window** scheduled (if needed)
- [ ] **Cutover plan** documented step-by-step

## Day 1 Post-Launch

- [ ] **Monitor error rates** closely
- [ ] **Check database performance** metrics
- [ ] **Verify backups** completed successfully
- [ ] **Validate invoice creation** with real orders
- [ ] **Test PDF downloads** from production
- [ ] **Confirm email/SMS notifications** working (if implemented)
- [ ] **Check payment gateway** integration (if live)
- [ ] **Monitor user feedback** via Slack/email
- [ ] **Prepare post-mortem** document for any issues

## Ongoing Maintenance (Weekly)

- [ ] Review error logs (Sentry)
- [ ] Check database size/growth
- [ ] Verify backup integrity
- [ ] Update dependencies (security patches)
- [ ] Review slow query logs
- [ ] Check storage utilization
- [ ] Test disaster recovery procedure
- [ ] Review uptime metrics

## Ongoing Maintenance (Monthly)

- [ ] Full backup restore test
- [ ] Performance analysis and optimization
- [ ] Security audit (penetration testing if applicable)
- [ ] Review and update runbooks
- [ ] Prepare billing/invoice reports
- [ ] Plan next release/features
- [ ] Team training on updates

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Development Lead | | | |
| DevOps/Infrastructure | | | |
| QA/Testing Lead | | | |
| Product Manager | | | |
| Security Officer | | | |

---

**Launch Date:** _______________  
**Prepared by:** _______________  
**Approved by:** _______________  
**Launch Status:** ☐ Ready ☐ Hold ☐ Escalated

