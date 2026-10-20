# Architecture

## Principles
1. Existing implementation takes precedence over a theoretical redesign.
2. Separate public menu reads from authenticated owner operations.
3. Enforce tenant ownership on the server for every private operation.
4. Keep order totals and state transitions server-authoritative.
5. Integrate external services only when already configured and verifiable.

## Logical components
- Public menu UI: café identity, categories, menu items, availability.
- Cart UI: selected item identifiers and quantities; no trusted prices.
- Order endpoint/service: validates café, items, availability, quantities, and customer input; calculates totals; persists order.
- Owner dashboard: authenticated list/detail/status operations scoped to the owner's café.
- Data layer: existing database and ORM/ODM.
- Optional storage/payment integrations: only when already present and safely configured.

## Typical flow
1. Customer opens `/menu/[cafeSlug]` or the equivalent route already used.
2. Application loads public café and menu data.
3. Customer edits a local cart.
4. Client submits item IDs, quantities, order type, and necessary customer details.
5. Server validates every item against the correct café and current availability.
6. Server recalculates total from trusted stored prices.
7. Server creates order and item snapshots atomically where supported.
8. Owner dashboard retrieves orders after authentication and tenant authorization.
9. Owner status update is validated on the server.

## Multi-tenancy
- Resolve tenant from a trusted route slug or authenticated server-side relationship.
- Do not trust a client-supplied `cafeId` as proof of authorization.
- Every dashboard query and mutation must be scoped to the authenticated user's café.
- If the existing application is single-café only, label it as a demo and document the limitation rather than claiming full SaaS isolation.

## Deployment
Use the current repository's supported deployment target. Vercel is the intended target only if framework, database connectivity, and runtime requirements are compatible.
