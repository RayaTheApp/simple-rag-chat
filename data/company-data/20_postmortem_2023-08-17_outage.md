# Post-Mortem: 2023-08-17 Production Outage

**Duration:** 42 minutes 17 seconds  
**Impact:** 100% request failures for Widget API; 16,700 failed mobile sessions.

## Timeline (UTC)

| Time | Event |
|------|-------|
| 07:55 | Terraform change deploys misconfigured ALB health check |
| 08:01 | First alert: 5xx rate >5% |
| 08:04 | PagerDuty Sev-1 escalated to on-call SRE |
| 08:28 | Rollback completed; traffic healthy |
| 08:37 | Incident resolved |

## Root Cause

ALB target group expected `/healthz` but app served `/status`. Change bypassed code review due to mis-tagged PR.

## Contributing Factors

1. Missing unit tests for Terraform module.
2. Health check paths inconsistent across services.
3. On-call had VPN latency, delaying SSH triage.

## Corrective Actions

- [x] Add integration test to validate ALB health checks.
- [x] Enforce PR label `infra` with CODEOWNERS.
- [ ] Migrate all services to `/healthz` endpoint (ETA Q2-2025).

## Lessons Learned

> "Fast is fine, but accuracy is final." – Wyatt Earp

Communication in Slack `#incidents` kept stakeholders informed; however, Statuspage update lagged by 12 min. We will automate Statuspage posting via PagerDuty webhooks.

