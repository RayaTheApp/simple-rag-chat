# User Security Guide

This guide helps **all employees** keep Acme Corp information secure.

## 1. Passwords

- Use a unique passphrase ≥ 14 characters.
- Store credentials in **1Password**; sharing via Slack DM is prohibited.

## 2. Multi-Factor Authentication

All SaaS apps integrated with Okta require MFA. Prefer **FIDO2** keys; fallback to TOTP.

## 3. Phishing Drills

Quarterly simulated phishing campaigns keep awareness high. Failure rate target: <3% clicks.

## 4. Device Hardening Checklist

| Control            | macOS | Windows |
|--------------------|-------|---------|
| Full-disk encryption | FileVault | BitLocker |
| Auto-lock          | 5 min | 5 min |
| OS updates         | ≤ 7 days | ≤ 7 days |

## 5. Reporting Incidents

Email **security@acme.example** or file a "Security Incident" ticket in Jira. PagerDuty escalation triggers for Sev-1 events.

