# Digital Menu & Ordering SaaS

**Working name:** MenuMint (rename only if the existing project already has a chosen name)  
**Target customers:** Independent cafés and small restaurants  
**Primary goal:** A mobile-first digital menu with QR access, customer ordering, and a simple restaurant dashboard.

## Documentation map
- `PRD.md` — product requirements and MVP scope
- `TRD.md` — technology and implementation requirements
- `ARCHITECTURE.md` — application boundaries and data flow
- `DESIGN.md` — UI/UX and visual rules
- `DATABASE.md` — data entities and consistency rules
- `SECURITY.md` — security checklist
- `TESTING.md` — verification plan
- `DEPLOYMENT.md` — Vercel release and deployment process
- `WORKFLOW.md` — checkpoint-by-checkpoint agent workflow
- `TASKS.md` — ordered implementation checklist
- `MASTER_PROMPT.md` — prompt to give Antigravity or another coding agent

## Important
These files guide work on the **existing repository**. The agent must inspect before changing code, complete one checkpoint at a time, report actual test results, and wait for permission at push/deployment gates. No prompt can guarantee zero errors; the objective is to detect and fix errors systematically.

## Time-boxed delivery
For a deadline under one hour, prioritize a coherent demo MVP: existing app startup, café menu page, menu item availability, cart, order submission in a safe demo mode, and a minimal owner dashboard if already feasible. Do not implement complex multi-tenant billing, real payment processing, or major rewrites during the time box unless already present and working.
