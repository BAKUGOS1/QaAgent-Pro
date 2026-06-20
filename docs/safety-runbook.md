# Safety Runbook

## Read-only fallback

Mutation is denied unless the environment, hostname, tenant, dedicated QA account, and configured visible staging marker all pass verification. A denied mutation gate produces a structured read-only decision so blueprint and UX audits can continue safely.

## Prohibited by default

- Delete and destructive bulk changes
- Real email, WhatsApp, calls, or other messages
- Payments, billing, subscriptions, and invitations
- Sensitive exports
- Mutation of untracked tenant records

## Evidence

Never store passwords, authorization headers, cookies, tokens, or secret query parameters. Use the shared redaction utility before writing structured data or messages.
