# Data Model and Consistency Rules

Adapt these concepts to the existing schema; do not replace the ORM or database under time pressure.

## Core entities
### Cafe
- `id`
- `name`
- `slug` (unique)
- optional description, contact/location details, timezone, and active/open state
- timestamps

### User / Membership
- Existing authentication user reference
- `cafeId` or membership relation
- role, if supported
- Must be resolved server-side for dashboard authorization

### MenuCategory
- `id`
- `cafeId`
- `name`
- `sortOrder`
- active state

### MenuItem
- `id`
- `cafeId`
- `categoryId`
- `name`
- description
- price stored in the project's appropriate precise currency representation (prefer integer minor units where compatible)
- optional image URL
- available state
- timestamps

### Order
- `id`
- `cafeId`
- public order reference
- order status
- order type if supported
- customer details limited to what is needed
- server-calculated subtotal/total
- timestamps

### OrderItem
- `id`
- `orderId`
- `menuItemId` reference where appropriate
- item-name snapshot
- unit-price snapshot
- quantity
- line total calculated by server

## Consistency requirements
- Unique café slug.
- Validate category/item relationship and tenant ownership.
- Validate positive bounded quantities.
- Use server-stored prices only.
- Snapshot item names/prices at order creation.
- Use transactions where supported for order and line-item creation.
- Use indexes for frequent tenant/order/menu lookups where appropriate.
- Never destructively migrate production data without explicit permission.

## Currency
Display the currency configured for the target café/market. Do not hardcode a different currency if the existing application already has a configured one.
