# PR20 Baseline

## Quality Gates
- contracts build: PASS
- FE lint: PASS
- FE typecheck: PASS
- FE build: PASS
- API typecheck: PASS
- API build: PASS
- API verify:smokes: PASS

## Smoke details
- smoke:full: PASS
- smoke:negative: PASS
- smoke:realtime: PASS
- smoke:oversell: PASS

## Notes
- Legacy API disabled check passed (`/api/*` -> 404)
- Branch mismatch negative passed
- 401/403/404/409/429 negative cases passed
- Idempotency duplicate behavior passed
- Realtime sanity + replay passed
- Oversell prevention passed deterministically