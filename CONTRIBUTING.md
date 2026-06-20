# Contributing to QaAgent-Pro

Thanks for helping build safer, more useful QA automation.

## Before changing code

1. Read [AGENTS.md](AGENTS.md).
2. Preserve deterministic execution and least-privilege browser access.
3. Do not add credentials, customer data, auth state, reports, traces, or screenshots.
4. Do not introduce random crawling or model-selected browser actions.
5. Add tests for new public behavior.

## Development

```bash
npm install
npx playwright install chromium
npm run quality:gate
```

For CRM integration work, use a dedicated staging tenant and local `.env`. Never use production credentials.

## Pull requests

- Keep the scope focused.
- Explain the user/QA impact.
- Include validation commands and results.
- Document any new safety permission.
- Report blocked or unverified behavior honestly.

By contributing, you agree that your contribution is licensed under the MIT License.
