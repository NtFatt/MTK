# Hadilao FE

Frontend cho customer + internal operations cua Hadilao Online.

## Stack
- React
- TypeScript
- Vite
- TanStack Query
- Zustand
- React Router
- Socket.IO client

## Local start
Tu root repo:

```powershell
pnpm install
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

FE mac dinh chay o `http://localhost:5173` va goi API `http://localhost:3001`.

## Quality gates
```powershell
pnpm -C apps/fe lint
pnpm -C apps/fe typecheck
pnpm -C apps/fe build
```

## Main surfaces
- Customer: QR bootstrap, menu, cart, checkout, payment, order status
- Internal: login, tables, kitchen, cashier, inventory, menu management, recipes, reservations, observability, realtime admin

## Important behavior
- Customer menu hien thi availability theo sellable stock hien tai.
- Cart mutations uu tien hold/release consistency, sau do invalidate lai menu/cart queries.
- Internal inventory pages tach ro `DB qty / Reserved / Available` thay vi chi nhin `menu_item_stock.quantity`.

## Known limits
- Public stock visibility van co fallback polling; chua phai branch-wide public realtime full-spec.
- Mot so flow van hanh nang cao van dua vao runbook/smoke de verify thay vi co FE automation hoan chinh.

Docs lien quan:
- [Runbook API](../api/docs/RUNBOOK.md)
- [Source Of Truth](../../docs/final/SOURCE_OF_TRUTH.md)
- [Known Issues](../../docs/final/KNOWN_ISSUES.md)
