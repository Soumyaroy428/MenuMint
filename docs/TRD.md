# Technical Requirements Document (TRD)

## 1. Technology policy
The existing repository is authoritative. Detect framework, package manager, runtime, database, ORM/ODM, authentication, image storage, and deployment configuration before changing anything.

Preferred only if starting from a genuinely empty project:
- Next.js + TypeScript
- Tailwind CSS
- Existing supported database with the ORM/ODM already chosen
- Vercel for deployment when compatible with the current app
Do not migrate a working project to this stack under a one-hour deadline.

## 2. Engineering rules
- Follow current file naming and code conventions.
- Keep frontend, server logic, and database operations in the repository's established boundaries.
- Validate untrusted inputs at server boundaries.
- Use typed request/response shapes where supported.
- Centralize shared validation and order rules where practical.
- Avoid duplicated business logic.
- Keep changes small and reviewable.
- Do not add dependencies unless necessary; explain the reason and compatibility first.
- Preserve the lockfile and package manager.

## 3. Required configuration
- Document required environment variable NAMES only.
- Never print or commit secret values.
- Validate required variables at startup or at the point of use.
- Keep private keys server-side; only explicitly public values may use client-exposed prefixes.
- Provide safe example placeholders in `.env.example` only if that file is consistent with the project.

## 4. API behavior
- Use consistent HTTP status codes and predictable response shapes.
- Reject malformed requests with a client error.
- Return not-found for missing resources.
- Return unauthorized/forbidden for access failures.
- Avoid exposing stack traces, database details, or secrets to clients.
- Log actionable errors without logging credentials or unnecessary personal data.

## 5. Data and order correctness
- Prices and availability are sourced from the server/database.
- Recalculate totals on the server.
- Enforce quantity bounds and order-size limits.
- Validate café/tenant ownership for every protected read or mutation.
- Use a database transaction for order and order-item creation when supported and needed.
- Prevent invalid status transitions.
- Avoid duplicate order creation where the current architecture supports idempotency.

## 6. Performance and reliability
- Avoid unnecessary client-side rendering and repeated API calls.
- Use image optimization or existing storage patterns where supported.
- Add graceful loading/error states.
- Avoid broad caching of tenant-specific or authenticated data.
- Ensure public menu data and private dashboard data have appropriate cache behavior.

## 7. Compatibility and build
- Inspect package scripts first.
- Run existing lint/typecheck/test/build commands where available.
- Do not claim a command passed unless it actually ran and passed.
- Fix errors introduced by current changes; document pre-existing failures.
