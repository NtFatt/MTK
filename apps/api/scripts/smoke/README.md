# Smoke runner hardening (Windows-friendly)

## What this patch fixes
- Prevents Newman from running while API is down (avoids ECONNREFUSED spam).
- Makes failures actionable (tells you to start API / check PORT).

## Apply
Copy this folder into your repo:
- scripts/smoke/wait-for-health.mjs

## Update package.json (recommended)
Install newman locally (avoid npx download every run):
  pnpm add -D newman

Then set scripts:

  "smoke": "node scripts/smoke/wait-for-health.mjs postman/Hadilao_Smoke_Local.postman_environment.json 30000 && newman run postman/Hadilao_Smoke_CoreFlow_v1.postman_collection.json -e postman/Hadilao_Smoke_Local.postman_environment.json --reporters cli"

## Run
1) In terminal A: pnpm dev
2) In terminal B: pnpm smoke
