# btl-backend

Services of the Smart Contract Workflow project (course: Microservices). NestJS 11, TypeScript.

The base (generic resource CRUD, storage with an audit hash chain, sign-in, permission matrix) is ported from CodeCash (`github.com/Tunhoclaptrinh/Code-n-Cash`, commit `c667ec4`), built here step by step; see `docs/PHAN_TICH.md` and `CHANGELOG.md`. It starts as one service (`services/api`) and is split into business services next.

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://127.0.0.1:3000/api/v1, Swagger at /api/docs
pnpm test         # CRUD tests; PostgreSQL tests run when DATABASE_URL is set
```

Seed accounts (password `Passw0rd!` in development): `sysadmin@codecash.vn`, `auditor@codecash.vn`, `admin@novaan.vn`, `owner@novaan.vn`, `controller@novaan.vn`, `supplier@phuminh.vn`.

## Branches

`base` holds the shared base only; `main` holds the base plus the business features. Base changes go
`base/<task>` → `base` → `main` (merge commit `sync: base → main`); features go `feat/<area>-<task>`
→ `main`. Both branches are protected (pull request, one review, CI). Details:
[docs/QUY_TRINH_NHANH.md](docs/QUY_TRINH_NHANH.md).
