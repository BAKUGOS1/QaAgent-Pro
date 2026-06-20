## What changed

## Why

## Safety impact

- [ ] No credentials, auth state, CRM data, reports, traces, or screenshots are committed
- [ ] New mutations are protected by staging gates
- [ ] No random crawler or model-selected browser action was introduced

## Verification

- [ ] `npm run quality:gate`
- [ ] `npm audit --audit-level=moderate`
