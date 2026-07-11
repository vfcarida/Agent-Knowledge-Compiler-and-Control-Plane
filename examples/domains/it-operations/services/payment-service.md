---
id: "svc-payment"
type: "Service"
title: "Payment Service"
owner: "team-finance"
repo: "https://github.com/org/payment-service"
language: "go"
tier: 1
dependencies:
  - "auth-service"
  - "pg-cluster-main"
---

# Payment Service

The Payment Service handles all credit card and wallet transactions. It is a Tier 1 service critical for revenue generation.

## Architecture

- Written in Go.
- Uses PostgreSQL for ACID transaction guarantees.
- Synchronously calls the Auth Service to validate tokens before processing.
