# PR Title
chore(fe): PR-XX <short scope>

## Why
- Mục tiêu nghiệp vụ / lý do kỹ thuật (1–3 bullet)

## Scope
- [ ] What changed (bullet list, cụ thể theo file/module)
- [ ] Out of scope (để tránh drift)

## Spec / Law Mapping
- FE Spec v2.0 sections: <e.g., §0 Guardrails, Appendix F, §13 UI/UX, §10 Data layer>
- UI Sample parity (nếu liên quan UI): <Navbar/Hero/CategoryTabs/MenuCard/...>
- Contracts used (`@hadilao/contracts`):
  - qk: <qk.*>
  - Schemas: <Schemas.*>
  - Errors: normalizeApiError()
  - Endpoints: /api/v1/<...>

## Screens / Evidence
- Before/After screenshots (nếu có)
- DevTools notes (bundle chunking/perf) nếu có

## Test / Gates
- [ ] `pnpm -C apps/fe lint`
- [ ] `pnpm -C apps/fe typecheck`
- [ ] `pnpm -C apps/fe build`

## Risk & Rollback
- Risk: <what could break>
- Rollback: <how to revert / feature flag / keep compat export>

## Follow-ups
- PR-YY: <next PR link>
