# Product Requirements Document (PRD)

## 1. Product summary
A lightweight SaaS product for independent cafés and small restaurants to publish a mobile-friendly digital menu, share it via QR code/link, and receive customer orders through a simple dashboard.

## 2. Problem
Small food businesses often rely on printed menus or scattered social-media messages. Updating prices is inconvenient, menus can become outdated, and staff may need to manually repeat order details.

## 3. Target users
- Café owner/manager: maintains menu and handles incoming orders.
- Café staff: reviews and updates order status.
- Customer: browses menu on a phone and places an order.
- Platform operator: optional future role for support and SaaS administration.

## 4. MVP success criteria
- A customer can open a café menu on mobile.
- Menu categories and items are readable and prices are clear.
- Unavailable items cannot be added to a new order.
- A customer can add/remove items, change quantities, enter required order details, and submit an order.
- The owner can view new orders and update permitted statuses.
- The app displays clear loading, empty, success, and error states.
- The project builds successfully and is deployable using the configured stack.
- No secrets are committed and no unverified payment success is displayed.

## 5. MVP scope
### Customer-facing
- Café landing/menu page.
- Menu categories.
- Item name, description, price, optional image, and availability.
- Search/filter only if already supported or can be implemented safely within the time budget.
- Cart with quantity updates and subtotal.
- Order type: takeaway/dine-in only if the existing schema supports it; otherwise use the simplest single order type.
- Customer name and contact/order notes only when genuinely required.
- Order confirmation with a non-sensitive order reference.

### Owner-facing
- Authenticated dashboard, if authentication already exists.
- List orders and view order details.
- Update order status using an allowed state transition.
- Add/edit/toggle availability for menu items only if feasible without destabilizing the project.
- Clear empty/loading/error states.

### Platform / SaaS
- Café-specific public menu URL or slug.
- Tenant isolation: one café must never access another café's menu-management data or orders.
- For the one-hour MVP, use the existing tenant model. If none exists, a single demo café may be used only when clearly labelled as demo; do not pretend multi-tenant SaaS is production-ready.

## 6. Explicitly out of scope for the one-hour MVP
- Subscription billing and automated plan enforcement.
- Multi-location inventory and advanced analytics.
- Loyalty points, coupons, delivery fleet, kitchen display systems.
- Real payment gateway integration unless already configured and verifiable.
- WhatsApp/SMS/email provider integration unless already configured.
- Complex role management or a complete rewrite of authentication.
- Large UI redesign or replacement of the database/ORM.

## 7. User stories
1. As a customer, I can view the menu without creating an account.
2. As a customer, I can identify item prices and availability.
3. As a customer, I can add available items to a cart and adjust quantities.
4. As a customer, I can submit an order and receive an order reference.
5. As a café owner, I can view orders for my café.
6. As a café owner, I can update an order's permitted status.
7. As an owner, I can mark a menu item unavailable.
8. As a customer, I see a useful message if an order cannot be submitted.

## 8. Order states
Use the states already present in the code if compatible. Otherwise prefer:
`PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `COMPLETED`
A permitted cancellation path may be added if the existing business rules support it. Validate every transition on the server.

## 9. Pricing and order rules
- Server recalculates prices using trusted database values.
- Client-submitted totals are never authoritative.
- Validate item existence, availability, quantity, and café ownership on the server.
- Snapshot item name and unit price into order items so historical orders remain meaningful.
- Do not create an order if validation fails.
- A demo order must be labelled as a demo/non-payment order if no real payment flow exists.

## 10. Acceptance criteria
- Menu loads with no fatal console or server errors.
- Cart total matches server-calculated order total.
- Invalid/unavailable items are rejected.
- Owner-only APIs reject unauthenticated or unauthorized requests.
- A tenant cannot access another tenant's orders.
- Loading, empty, success, and error states are visible.
- Build/test results are reported truthfully.
