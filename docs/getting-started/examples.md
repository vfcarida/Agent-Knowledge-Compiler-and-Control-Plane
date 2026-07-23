# Examples

## Tailoring a Resume via Profile Server

Connect Claude Desktop to the Profile Server and prompt:

> "Please use tailor_resume_from_job against my OKF bundle using the job description at https://linkedin.com/mock-job. Emphasize my TypeScript skills."

## Requesting an Automation Token

Connect to the Automation Server and prompt:

> "Prepare an application for https://linkedin.com/mock-job."

The LLM will return a token. You must then say:

> "I approve. Confirm application submission using token X."

## Flagship Domains

To prove its domain-agnostic architecture, AKCP implements distinct flagship scenarios:

| Domain | Why it exists | What it demonstrates |
|---|---|---|
| IT Operations | enterprise flagship | runbooks, incidents, approvals, audit |
| Career | low-friction starter domain | personal knowledge compilation |
| Customer Support | third flagship enterprise use case for policy-aware, privacy-preserving support knowledge compilation | showing how AKCP handles tickets, macros, policies, customer history, PII redaction, escalation, and quality evaluation |
