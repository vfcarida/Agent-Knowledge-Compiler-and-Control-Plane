# Examples

## Tailoring a Resume via Profile Server

Connect an MCP client (such as Claude Desktop, Cursor, or a custom agent) to the Profile Server and query:

> "Please use tailor_resume_from_job against my OKF bundle using the job description at https://linkedin.com/mock-job. Emphasize my TypeScript skills."

## Requesting an Automation Token

Connect to the Automation Server and query:

> "Prepare an application for https://linkedin.com/mock-job."

The server issues an approval token for gated side-effects. The operator then approves:

> "I approve. Confirm application submission using token X."

## Flagship Domains

To prove its domain-agnostic architecture, AKCP implements distinct flagship scenarios:

| Domain           | Why it exists                                                                                         | What it demonstrates                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| IT Operations    | enterprise flagship                                                                                   | runbooks, incidents, approvals, audit                                                                                   |
| Career           | low-friction starter domain                                                                           | personal knowledge compilation                                                                                          |
| Customer Support | third flagship enterprise use case for policy-aware, privacy-preserving support knowledge compilation | showing how AKCP handles tickets, macros, policies, customer history, PII redaction, escalation, and quality evaluation |
