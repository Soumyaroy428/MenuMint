# MASTER PROMPT — Move Existing Local YouPI-PG to a Secure Public Deployment

## Role

Act as a senior DevOps, Node.js, TypeScript integration, and application-security engineer. The YouPI-PG repository already runs on the developer's localhost. The goal is to prepare a **publicly reachable, securely configured deployment for controlled testing**, and integrate the developer's existing TypeScript application with it.

Do not describe YouPI-PG as a certified or production-ready payment gateway. The upstream project labels itself experimental and says it is not certified, bank-approved, audited, or production-ready. Do not enable real-customer payment processing or represent an observer alert as conclusive settlement proof. Real-money use must remain blocked until independent review and approval.

## Hard rules

- Inspect the current checkout of the repository and its current docs before making changes. Do not rely on stale deployment instructions.
- The upstream repository is the source of truth for current ports, scripts, environment variables, Docker files, API routes, SDK, webhook contracts, and health checks.
- Never invent configuration keys, commands, SDK methods, API routes, or merchant credentials.
- Do not commit `.env`, private keys, OAuth credentials, webhook secrets, admin passwords, bank notifications, OTPs, or customer data.
- Do not expose the admin dashboard, control center, observer-management endpoints, SQLite file, debugger, or logs to the public internet.
- Do not remove security checks, accept unsigned webhooks, mark orders paid from frontend redirects, or weaken payment verification to make a demo work.
- Do not change unrelated features in the existing merchant application.
- Do not push, deploy, change DNS, rotate live credentials, incur paid services, or enable real-money processing without explicit user approval at the relevant checkpoint.
- If a deployment provider requires payment or a paid plan, stop and ask for approval.

## Phase 0 — Inventory and feasibility report (do this first)

1. Inspect the YouPI-PG repository root, Git status, current branch, package scripts, `.env.example`, `Dockerfile`, `docker-compose.yml` if present, deployment documentation, health endpoint, SQLite persistence setup, startup/supervisor behavior, admin auth, observer configuration, webhook delivery/signature code, and `openapi.yaml`.
2. Inspect the existing merchant TypeScript application's framework, routes, order model, authentication, database, payment code, environment templates, and deployment target.
3. Determine the exact current service ports and which services need long-running processes, browser automation, Android access, OAuth, or persistent volumes.
4. Identify security blockers, missing secrets, required domains, hosting requirements, database backup requirements, and any undocumented behavior.
5. Report findings and propose a minimal plan. **Stop for user approval before modifying files or deploying.**

## Phase 1 — Choose a deployment model

Prefer a maintained Linux VPS or another container host that supports persistent containers, persistent volumes, health checks, and required long-running processes.

Do not assume Vercel can host the entire multi-service YouPI-PG process supervisor, browser automation, Android observer, or local SQLite database. Vercel may host the merchant's Next.js application, while YouPI-PG is deployed separately.

Compare the current repository's supported deployment methods:
- Native Node.js service managed by systemd or an equivalent process manager.
- Docker/Compose if the current checkout includes and documents working container configuration.

Choose only after checking the actual files. Explain expected costs and limitations; do not purchase anything.

## Phase 2 — Secrets and environment

1. Use the current `.env.example` and configuration documentation as the exact variable reference.
2. Generate strong unique secrets locally using a cryptographically secure generator. Do not invent fixed example secrets or expose generated secrets in chat, logs, code, screenshots, or commits.
3. Configure the documented encryption key, JWT secret, initial admin credentials, canonical public payment API URL, checkout URL, and required OAuth variables only if their services are enabled.
4. Set strong unique admin credentials and disable/remove defaults.
5. Set the appropriate production mode using the current startup script's documented requirements.
6. Configure allowed storefront origins / checkout frame ancestors to the exact merchant application origins.
7. Ensure `.env` is ignored by Git. Keep a safe `.env.example` with empty or clearly fake placeholders.
8. Check Git status and history for leaked secrets. If any were exposed, stop and recommend rotation; do not repeat the secret.
9. Never place private merchant credentials or webhook secrets in `NEXT_PUBLIC_*` variables.

## Phase 3 — Container/process and persistence hardening

1. Use the repository's supported production startup path.
2. Run the application as a non-root user where supported.
3. Persist SQLite at the documented database path using a durable volume or host directory with restrictive permissions.
4. Confirm that a restart does not delete payment records. Verify backup and restore procedures with a test database.
5. Configure automatic restart, health checks, log rotation, resource limits where supported, and a documented recovery procedure.
6. Avoid publishing all internal ports. Only publish the minimum public services required for checkout/API operation.
7. Bind the admin dashboard, control center, and observer administration interfaces to loopback/private networking or protect them with a secure private access layer.
8. Do not expose Chrome DevTools Protocol or browser debugging ports publicly.
9. Confirm whether the current container setup actually supports every required observer. If a component cannot run in the chosen container environment, document a separate secure deployment plan rather than silently omitting it.

## Phase 4 — Domain and HTTPS

1. Ask the user to supply or approve the domain and hosting provider before changing DNS.
2. Configure DNS to the selected server.
3. Use the repository's supported reverse proxy (e.g., Caddy or NGINX) or managed HTTPS ingress.
4. Use valid TLS certificates and redirect HTTP to HTTPS.
5. Set the exact canonical `BASE_PAYMENT_API_URL`, `BASE_CHECKOUT_URL`, and any other required public URL variables according to current docs.
6. Ensure the merchant application can reach the gateway from its server environment.
7. Configure CORS and Content Security Policy / checkout frame ancestors for only the required origins.
8. Keep admin, control center, and observers off public routes.
9. Verify health endpoints, proxy behavior, headers, timeouts, and SSE/websocket behavior if used.
10. Never use localhost as a production API URL unless the documented service-to-service topology makes that exact loopback address correct.

## Phase 5 — Merchant integration

1. Read the current official merchant integration guide and OpenAPI specification.
2. Verify the current SDK package, method signatures, API key format, payment creation request/response, return URL behavior, event payload, and webhook signature scheme from source.
3. Implement the merchant payment adapter in the existing TypeScript app without rewriting its architecture.
4. Derive amounts and order ownership on the server; never trust browser-provided amounts or payment statuses.
5. Persist payment attempts and gateway IDs in the existing database with transaction-safe state transitions and idempotency.
6. Validate webhook signatures according to the exact active contract and raw-body requirements. Deduplicate delivery IDs and process events atomically.
7. Do not treat redirect query parameters, QR screenshots, SMS/email text, or client-side callbacks as proof of settlement.
8. Use a clearly labelled test/pending-verification state where payment settlement cannot be independently confirmed.
9. Do not grant access, ship goods, or activate valuable subscriptions on an unverified observer event.
10. Do not add real payment credentials to the client bundle.

## Phase 6 — Security and payment safety review

Review and test:
- Authentication and authorization.
- Admin default credentials and private admin endpoints.
- TLS, CORS, CSP, and origin allowlists.
- Rate limiting and request-size limits.
- Secret management and log redaction.
- Webhook signature validation, replay handling, delivery deduplication, and idempotency.
- Amount, currency, merchant, gateway payment ID, and order-ID consistency.
- Duplicate requests and concurrent payment attempts.
- Delayed events, ambiguous timeouts, retries, database failures, and process restarts.
- Backups and restore.
- Data retention, customer privacy, bank alert access, and observer permissions.
- Refunds, disputes, charge/payment mismatch, and reconciliation.
- Current bank terms, UPI rules, and applicable Indian legal/regulatory obligations.

The project is experimental. A successful health check, test suite, or HTTPS deployment does not make it certified or safe for business-critical real payments. Do not claim that the application is production-ready. Keep live customer payments disabled pending independent security, bank/compliance, and settlement review.

## Phase 7 — Controlled test plan

Use test data and an isolated test setup. Verify:
1. Every required process starts and remains healthy.
2. Gateway restarts preserve data.
3. Checkout is reachable only via HTTPS.
4. Admin and internal endpoints are not public.
5. Merchant order creation uses server-calculated amounts.
6. Valid/invalid webhook signatures behave correctly.
7. Duplicate webhooks do not duplicate fulfillment.
8. Failed/expired events cannot downgrade a paid order.
9. Network timeouts and ambiguous outcomes remain pending for reconciliation.
10. Logs contain no secrets or unnecessary personal/financial data.
11. Backup and restore works.
12. The app works from the actual deployed merchant domain.
13. Rollback can restore the prior version and data safely.

Do not simulate successful production payment evidence. Mock provider calls only in isolated automated tests and label them as mocks.

## Phase 8 — Operations and handover

Create/update only relevant docs:
- `docs/deployment-runbook.md`
- `docs/payment-integration.md`
- `.env.example`
- deployment-specific health/backup/restore notes

Document:
- Architecture and public/private endpoints.
- Required environment variables and how to set them without revealing values.
- Deploy/update/restart/rollback commands.
- Database backup and restore.
- Health checks and logs.
- Secret rotation.
- Incident response and reconciliation steps.
- Known limitations and explicit experimental status.
- What remains blocked before real-money activation.

## Checkpoints and approval gates

- **CP0:** Inspect both repositories and report findings. No edits.
- **CP1:** Propose hosting, domain, persistence, and security architecture. Wait for approval.
- **CP2:** Prepare configuration and deployment files. Do not commit secrets.
- **CP3:** Deploy to a controlled test environment only after approval.
- **CP4:** Integrate the merchant TypeScript application using verified API contracts.
- **CP5:** Run tests, security review, backup/restore, and external reachability checks.
- **CP6:** Present evidence, known risks, rollback plan, and remaining blockers. Do not enable real-money transactions.

At each checkpoint, report files changed, commands run, actual test results, blockers, and next steps. Run lint, type checks, and tests when applicable; never claim tests passed unless actually executed. Inspect `git diff` and preserve unrelated user work.

## Final instruction

Start with **CP0 only**. Inspect the existing local deployment, current YouPI-PG documentation/source, and merchant application's payment flow. Return a factual readiness report and proposed plan. Do not modify files, expose the local machine publicly, push to GitHub, configure DNS, purchase hosting, or deploy until the user approves.

The goal is a secure public test deployment and a carefully integrated merchant checkout—not an unsupported claim that experimental software is a certified production payment gateway.
