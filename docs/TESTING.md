# Testing and Acceptance Checklist

## Baseline
- [ ] Inspect available package scripts.
- [ ] Record pre-existing lint/typecheck/test/build failures.
- [ ] Run only commands supported by the repository.

## Public menu
- [ ] Valid café slug loads correct menu.
- [ ] Unknown slug shows a useful not-found state.
- [ ] Categories and items display correctly.
- [ ] Unavailable items cannot be added.
- [ ] Narrow mobile viewport has no horizontal overflow.

## Cart and order
- [ ] Add, remove, and change quantity.
- [ ] Empty cart cannot submit an order.
- [ ] Invalid quantity is rejected by server.
- [ ] Client-submitted price/total is ignored.
- [ ] Missing, inactive, or foreign-café items are rejected.
- [ ] Order and line items are consistent.
- [ ] Success response includes a safe order reference.
- [ ] Failure state does not falsely indicate success.

## Dashboard and access control
- [ ] Unauthenticated user cannot access private dashboard APIs.
- [ ] Café A cannot read or modify Café B's orders/items.
- [ ] Invalid order state transition is rejected.
- [ ] Authorized owner can perform permitted updates.
- [ ] Empty/loading/error states are understandable.

## Automated checks
- [ ] Run project lint command if available.
- [ ] Run typecheck if available.
- [ ] Run unit/integration tests if available.
- [ ] Run production build.
- [ ] Review changed files and diff.
- [ ] Report commands that could not be run and why.

## Live smoke test (only after deployment approval)
- [ ] Homepage and public menu load.
- [ ] Static assets and images load.
- [ ] Core API routes respond correctly.
- [ ] Dashboard access control works.
- [ ] Database-backed behavior works.
- [ ] No live payment or destructive production data is created without approval.
