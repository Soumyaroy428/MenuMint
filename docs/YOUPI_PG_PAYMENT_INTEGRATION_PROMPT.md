# MASTER IMPLEMENTATION PROMPT — YouPI-PG Payment Integration

## Role

Act as a senior full-stack TypeScript engineer and application security reviewer. Integrate **YouPI-PG** into the existing application as an experimental, self-hosted UPI checkout option. Do not replace the application's existing architecture or unrelated features.

## 1. Primary goal

Implement a complete, maintainable payment integration that lets a customer:

1. Select the UPI payment method at checkout.
2. Create an order using the application's existing backend and database.
3. Initiate a YouPI-PG payment session from a trusted server-side route.
4. Open the configured hosted checkout / QR payment page.
5. See a pending, successful, failed, expired, or cancelled state.
6. Have the order marked as paid **only after server-side verification and durable payment reconciliation**.
7. View a clear result page and retry safely where appropriate.

This is an integration with the existing YouPI-PG project, not an instruction to rebuild a payment gateway from scratch.

## 2. Mandatory first step: inspect before changing

Before editing any file:

- Inspect the complete existing project structure, package manifests, framework version, TypeScript configuration, database schema, authentication, order/cart flow, existing payment code, environment conventions, tests, and deployment configuration.
- Read the current YouPI-PG repository README and the relevant current documentation, including merchant integration, API/OpenAPI contract, installation, configuration, architecture, and webhook/signature documentation.
- Confirm the exact SDK package name, installed version, constructor arguments, payment creation method, request/response fields, webhook event format, signature headers, and signature verification method from the actual source/docs.
- Do not assume API methods, event fields, headers, environment variable names, routes, or SDK behavior based on examples from another version.
- Record a short implementation plan and list the exact files expected to change.
- Preserve all existing working features. Do not overwrite or restructure files unnecessarily.

If the repository documentation or source does not establish a required detail, mark it as unresolved and ask for the missing configuration or implement a clearly isolated adapter that cannot process real payments until configured. Do not invent a working API contract.

## 3. Compatibility requirements

Adapt the implementation to the stack detected in the existing application:

- Next.js App Router + TypeScript: use server-only Route Handlers for payment creation and webhook processing.
- React + TypeScript + Express: use server-side Express routes and keep payment credentials out of the React bundle.
- Prisma, MongoDB/Mongoose, or another database: reuse the existing data layer and conventions. Do not introduce a second database without a justified requirement.
- Use the existing package manager and lockfile. Do not switch package managers.
- Keep payment provider logic behind a small server-side service/adapter so it can be tested and maintained independently.

Do not assume that deploying the merchant application to Vercel also deploys YouPI-PG. YouPI-PG may require multiple long-running services, persistent SQLite storage, and observer processes. Treat the gateway as a separately deployed dependency unless its current documentation proves otherwise.

## 4. Environment configuration

Add only the required server-side environment variables to `.env.example` or the project's documented environment template. Never add real secrets to source control.

Use names consistent with the verified YouPI-PG SDK and configuration. Candidate names below are placeholders and must be reconciled with the actual integration contract:

```env
YOUPI_API_URL=http://localhost:6100
YOUPI_MERCHANT_ID=
YOUPI_WEBHOOK_SECRET=
APP_URL=http://localhost:3000
```

Requirements:

- Validate required variables at server startup or before initiating payment, with clear safe error messages.
- Never use `NEXT_PUBLIC_` for merchant credentials, webhook secrets, API private keys, or signing keys.
- Do not log secret values, OTPs, sensitive bank alerts, full webhook secrets, or unnecessary personal/financial data.
- Add `.env*` to `.gitignore` while allowing safe example files such as `.env.example`, if not already configured.
- Explain how to acquire/configure each value using the actual repository instructions; never make up a merchant ID or secret.
- Clearly distinguish the merchant application's URL from the gateway API and hosted-checkout URLs.

## 5. Payment data model and state machine

Inspect and extend the existing database schema minimally. Reuse existing order and payment entities when possible.

Persist, as appropriate:

- Internal order ID and authenticated owner/customer reference.
- Unique local payment attempt ID.
- Gateway payment/session ID.
- Amount as integer minor units (paise) or the application's established exact decimal-money representation; avoid floating-point calculations.
- Currency (INR when supported by the configured gateway).
- Payment status and timestamps.
- Gateway transaction reference/UTR only where supplied and appropriate.
- Webhook event/delivery ID and idempotency information.
- A safe audit trail of relevant state transitions.

Use an explicit state machine with documented allowed transitions. Typical states may include `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `EXPIRED`, and `CANCELLED`, but reconcile these with the actual gateway contract.

Requirements:

- The browser must never decide the amount, merchant ID, paid status, or gateway verification result.
- Calculate the amount on the server from trusted product prices, discounts, tax, shipping, inventory and order data.
- Verify the order belongs to the current authenticated user/session.
- Use database transactions and uniqueness constraints where supported.
- Never downgrade a successfully paid order because a delayed failure/expiry event arrives.
- Support safe retries without accidentally creating duplicate orders or charging twice.
- Record and handle ambiguous outcomes; do not treat network timeouts as proof that a payment failed.

## 6. Payment creation endpoint

Implement the framework-appropriate server endpoint, using the project's existing route conventions. It must:

1. Authenticate the user and authorize access to the order.
2. Validate the request schema and reject malformed IDs.
3. Load the order from the database and verify it is payable.
4. Calculate the authoritative amount on the server.
5. Create or reuse a local payment-attempt record with idempotency protection.
6. Call the **verified** YouPI-PG API/SDK contract from server-side code.
7. Persist the returned gateway session/payment ID and state.
8. Return only the minimum information the browser needs, such as a validated checkout URL and local payment attempt ID.
9. Handle gateway timeouts, invalid responses, duplicate requests, and unavailable configuration without leaking internals.
10. Never expose the merchant secret or webhook secret in API responses.

Validate checkout URLs against the configured trusted gateway origin(s) before redirecting. Do not blindly redirect to arbitrary URLs returned by user-controlled input.

## 7. Checkout user interface

Implement a responsive, accessible payment option that fits the application's existing design system.

Include:

- A clear “Pay with UPI” / “Continue to payment” action.
- Loading and disabled states to prevent accidental repeated submissions.
- A useful error message and safe retry action.
- Redirect to the verified hosted checkout URL or use the officially supported checkout embed if current docs support it.
- Pending, processing, success, failure, expiry, and cancellation views where applicable.
- Mobile-friendly layout, keyboard accessibility, labels, and screen-reader status announcements.
- A result/return page that fetches status from the application's backend.

**Critical:** the return URL, browser query parameter, frontend callback, screenshot, QR display, or user claim is not proof of payment. The UI must obtain the authoritative order/payment status from the backend.

Do not invent an embed script, SDK browser API, QR payload, or payment URL. Use the documented integration contract only.

## 8. Webhook endpoint and verification

Implement the documented YouPI-PG webhook route using the exact contract confirmed from the current repository.

- Read the original raw request body when required by the signature scheme.
- Verify the actual signature and timestamp according to the documented algorithm and SDK.
- Enforce documented timestamp tolerance and replay protections where applicable.
- Validate the event schema, merchant/account, gateway payment ID, local order ID, amount, currency, and payment status.
- Deduplicate webhook deliveries and payment events using durable database constraints or equivalent transaction-safe logic.
- Process state transitions atomically and safely under concurrent/retried deliveries.
- Acknowledge successful processing only after durable processing succeeds.
- Return appropriate error statuses for invalid signatures or malformed events.
- Ensure logs do not expose secrets or sensitive transaction contents.
- If the gateway has multiple signature versions, implement only the verified supported version(s) and document which one is active. Never accept an unsigned fallback.
- If webhook verification fails or the contract is unknown, fail closed. Do not mark an order paid.

Implement order fulfillment (subscription activation, download access, shipment, etc.) only after the verified paid transition. Make fulfillment idempotent too.

## 9. Independent payment reconciliation

Because YouPI-PG is described as an experimental, notification-observer-based project, do not treat a parsed SMS/email alert or multiple correlated alerts as unquestionable proof of settlement.

- Use the strongest reliable verification/reconciliation available for the intended setup.
- Keep `PAID` separate from `PENDING_VERIFICATION` if independent confirmation is not available.
- Do not fulfill valuable orders solely from untrusted client callbacks or unverified observer payloads.
- Document the exact trust assumptions and operational limitations.
- Do not bypass bank controls, request a customer's net-banking password, or implement unsafe screen scraping.
- Before real-money use, require human review of bank/provider terms, applicable Indian regulatory requirements, payment attribution, refunds, disputes, and settlement reconciliation.

If the current gateway cannot safely establish the needed payment confirmation, implement a sandbox/demo mode or a clearly labelled pending-verification flow rather than pretending that live payment verification works.

## 10. Security requirements

- Validate all inputs on the server.
- Apply authentication, authorization, request-size limits, and appropriate rate limits.
- Use CSRF/origin protections where applicable to the application's authentication model.
- Protect against IDOR, replay attacks, webhook forgery, duplicate fulfilment, open redirects, and amount tampering.
- Use constant-time signature comparison if implementing signature comparison manually and if appropriate to the specified scheme.
- Use HTTPS for all public production endpoints.
- Restrict access to gateway admin panels, observer endpoints, debugging endpoints, and database files.
- Store only the minimum personal and financial data needed; define retention and redaction rules.
- Do not store card data or collect UPI PINs.
- Do not add production secrets to logs, commits, screenshots, test fixtures, or documentation.
- Keep dependencies current and review newly added packages before installation.

## 11. Testing requirements

Add or update automated tests following the project's existing test framework.

Cover at least:

1. Successful payment-session creation.
2. Unauthenticated request.
3. User attempting to pay another user's order.
4. Invalid or missing order ID.
5. Amount tampering from the browser.
6. Already-paid or cancelled order.
7. Missing/invalid environment configuration.
8. Gateway timeout and malformed gateway response.
9. Valid webhook.
10. Invalid signature and missing signature.
11. Stale timestamp/replay, where supported by the signature protocol.
12. Duplicate webhook delivery.
13. Concurrent duplicate payment requests.
14. Amount/currency/order mismatch.
15. Delayed failure event after success.
16. Return URL visited before webhook arrival.
17. Idempotent fulfillment.
18. Failed database transaction and safe retry.

Use mocked gateway responses or official sandbox/test facilities. Never simulate a real payment as successful in production. If the gateway has no reliable sandbox, keep end-to-end tests isolated and clearly labelled as simulations.

## 12. Deployment requirements

- Document local startup and the exact required services.
- Document which components need persistent processes and storage.
- Configure environment variables through the deployment provider's secret manager.
- Configure the public webhook URL in the actual gateway configuration.
- Use HTTPS and validate trusted origins.
- Configure database backups, migrations, process supervision, monitoring, and recovery.
- Do not assume Vercel can host the entire multi-process YouPI-PG stack.
- Ensure `localhost` URLs are replaced with reachable URLs in deployed environments.
- Provide a deployment checklist and a rollback plan.
- Do not deploy or enable real payments automatically.

## 13. Documentation to create/update

Create or update only relevant documentation, using existing project conventions:

- `docs/youpi-payment-integration.md`: architecture, setup, environment variables, payment lifecycle, local development, deployment, webhook configuration, known limitations, troubleshooting, and rollback.
- `.env.example`: safe variable names and descriptions, no real values.
- Relevant tests and code comments.

Do not create unnecessary duplicate documentation if equivalent files already exist.

## 14. Working method and checkpoints

Work in small checkpoints. After each checkpoint:

1. Summarize the files changed.
2. Run relevant linting, type checks, and tests.
3. Fix errors before moving to the next checkpoint.
4. Preserve unrelated work and inspect `git diff`.
5. Do not claim a test passed unless it was actually run.

Suggested checkpoints:

- **CP0:** Inspect project and gateway documentation; report compatibility and unresolved API details.
- **CP1:** Propose minimal data-model and architecture changes.
- **CP2:** Add validated configuration and provider adapter.
- **CP3:** Implement server-side payment creation and database persistence.
- **CP4:** Implement checkout UI and server-authoritative status page.
- **CP5:** Implement secure, idempotent webhook processing and fulfillment.
- **CP6:** Add tests, security review, documentation, lint and type checks.
- **CP7:** Review deployment and rollback plan.

Stop at any blocker caused by missing merchant configuration, undocumented API behavior, or an unsafe payment-verification model. Ask for the exact missing information rather than guessing.

## 15. Final acceptance criteria

The integration is complete only when:

- Existing application functionality remains intact.
- Payment creation uses server-derived order amounts.
- Secrets remain server-side.
- Checkout uses the real documented gateway contract.
- A client-side redirect cannot mark an order paid.
- Webhook signatures are validated and events are idempotent.
- Order/payment states are persisted consistently.
- Automated tests and type checks are run and results reported accurately.
- Local setup, deployment, troubleshooting and rollback are documented.
- Unverified settlement and regulatory limitations are explicitly disclosed.

## Final instruction

Start with **CP0 only**. Inspect the existing application and current YouPI-PG source/docs first. Do not immediately write code, invent SDK methods, replace architecture, change unrelated files, push commits, or deploy. Report the findings and ask for approval before any production deployment or real-money activation.
