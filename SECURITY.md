# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories for this repository. Do not open a public issue containing credentials, tokens, customer data, or exploit details.

## Sensitive local files

The following must never be committed:

- `.env` and `.env.*` except `.env.example`
- `.auth/` browser storage state
- generated reports, screenshots, traces, logs, and state
- exported CRM data

## Runtime safety

Mutations require verified staging environment, allowlisted host and tenant, dedicated QA account, and a visible staging/test marker. Delete, real messages, sensitive export, payment, billing, and invitation actions are blocked by default.

If any gate fails, QaAgent-Pro must switch to read-only mode.
