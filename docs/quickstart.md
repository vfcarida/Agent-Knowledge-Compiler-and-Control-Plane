# Quickstart

Welcome to the Agent Knowledge Compiler and Control Plane. This quickstart will help you get running in under 5 minutes.

## Prerequisites
- Node.js >= 22
- pnpm >= 10
- corepack enabled (`corepack enable`)

## Installation
```bash
git clone https://github.com/vfcarida/AKCP-Knowledge-Reference-Architecture.git
cd AKCP-Knowledge-Reference-Architecture
pnpm install --frozen-lockfile
cp .env.example .env
```

## Running the Architecture
```bash
# Verify the sample bundle
pnpm validate:bundle --bundle sample-data/.okf

# Run the Profile Server for local MCP interactions
pnpm dev:profile-server

# Run the Automation Server (sandbox mode by default)
pnpm dev:automation-server
```
