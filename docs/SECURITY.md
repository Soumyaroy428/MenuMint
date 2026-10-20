# Security Checklist

## Authentication and authorization
- [ ] Owner dashboard requires valid authentication.
- [ ] Server verifies the owner belongs to the target café.
- [ ] Every private API checks authorization, not just page navigation.
- [ ] Customer requests cannot modify owner-only fields.
- [ ] Order lookup does not expose another customer's or café's private data.

## Input and API protection
- [ ] Validate and normalize all user input server-side.
- [ ] Bound quantities, text lengths, request sizes, and pagination.
- [ ] Reject invalid item IDs, quantities, order types, and state transitions.
- [ ] Handle injection and XSS risks using framework-safe patterns.
- [ ] Protect cookie-based state-changing requests against CSRF where relevant.
- [ ] Rate-limit sensitive or abuse-prone endpoints when supported.
- [ ] Configure CORS narrowly if cross-origin requests are needed.

## Price, inventory, and orders
- [ ] Never trust client-submitted prices or totals.
- [ ] Recheck availability and ownership at order submission.
- [ ] Prevent invalid order status changes.
- [ ] Do not claim payment succeeded without verified provider confirmation.
- [ ] Do not expose customer contact details unnecessarily.

## Secrets and production
- [ ] No credentials in source, Git, browser bundles, logs, or docs.
- [ ] Server-only variables remain server-side.
- [ ] Production errors do not reveal stack traces or internal details.
- [ ] HTTPS and secure cookie settings are appropriate for production.
- [ ] Webhooks, if present, verify provider signatures.
- [ ] Production migrations and destructive operations require explicit approval.

## Release policy
A checklist item is not marked passed unless evidence supports it. Document items not tested. Do not describe the application as fully secure based only on a source-code scan.
