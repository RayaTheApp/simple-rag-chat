# Acme Corp Security Policy

Last updated: **2025-01-02**

## 1. Overview

Security is everyone’s responsibility. This document outlines mandatory controls for all Acme Corp information assets.

## 2. Classification

| Level | Examples | Handling |
|-------|----------|----------|
| Public | Marketing site, job postings | No restrictions |
| Internal | Org charts, sprint boards | Share inside company Slack |
| Confidential | Source code, customer data | Require VPN + SSO |
| Restricted | Payroll records, M&A docs | Encrypted storage, need-to-know |

## 3. Network Controls

- All production traffic flows through a **zero-trust** mesh.
- SSH access is limited to bastion hosts using **FIDO2** hardware keys.

## 4. Vulnerability Management

Patches must be applied:

1. Critical (CVSS ≥ 9) → 24 h
2. High (7–8.9) → 72 h
3. Medium (4–6.9) → Next sprint

## 5. Incident SLAs

| Severity | Response | Mitigation |
|----------|----------|------------|
| Sev-1    | 15 min   | 4 h |
| Sev-2    | 1 h      | 24 h |

