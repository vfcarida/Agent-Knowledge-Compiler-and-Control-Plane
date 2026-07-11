---
id: "runbook-failed-deploy"
type: "Runbook"
title: "Failed Deployment Runbook"
tags: ["deploy", "rollback", "incident"]
---

# Failed Deployment Runbook

If a deployment fails health checks or causes an immediate spike in 5xx errors, it is considered a Failed Deployment.

## Rollback Procedure

1. Halt the deployment pipeline.
2. Identify the previous stable version from the deployment manifest.
3. Use the `rollback_deployment` capability to revert to the stable version. Note that this requires Human Approval.
4. Notify the service owner in the `#incidents` channel.
