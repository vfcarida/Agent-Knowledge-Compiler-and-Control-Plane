---
id: "svc-auth"
type: "Service"
title: "Auth Service"
owner: "team-security"
repo: "https://github.com/org/auth-service"
language: "rust"
tier: 1
---

# Auth Service

The Auth Service manages JWT issuance, validation, and user sessions.

## Architecture

- Written in Rust for high performance.
- Uses Redis for session caching.
