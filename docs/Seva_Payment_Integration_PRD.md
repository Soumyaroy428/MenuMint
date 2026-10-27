# SEVA — Payment Integration PRD & AI Implementation Prompt

**Project:** Seva — Donation and Food Distribution Platform  
**Feature:** Secure QR-Based Donation and Payment Verification  
**Currency:** INR (₹)  
**Minimum Donation:** ₹20  
**Priority:** High  
**Implementation Type:** Integrate into the existing application without breaking existing features.

---

## 1. Objective

Implement a complete, secure donation payment system for Seva. Donors should be able to enter their details, choose a donation amount, scan a payment QR code using a UPI application, verify their payment, receive a success message and receipt, and have the verified transaction recorded in the database.

The implementation must integrate with the existing Admin, Donor, and Volunteer dashboards.

## 2. Mandatory Instructions for the AI Developer

Before making any changes:

1. Inspect the existing repository and identify its frontend, backend, database, authentication, payment logic, and dashboard structure.
2. Read all existing PRD, TRD, workflow, audit, and project instruction files, if present.
3. Identify existing payment components and database models before creating new ones.
4. Reuse the existing architecture, dependencies, UI components, and coding conventions wherever possible.
5. Do not delete, overwrite, or unnecessarily refactor working features.
6. Implement the payment functionality incrementally and test each checkpoint.
7. Never expose API secrets, payment gateway secrets, or webhook secrets in frontend code.
8. Do not mark payments successful based only on frontend responses, screenshots, or user-submitted transaction IDs.

**Important:** Do not replace the existing application with a new project. Modify only the files required for this feature.

## 3. Payment User Journey

### Step 1: Select Donation Amount

The donor selects a campaign or chooses a general donation.

Suggested amounts: ₹20, ₹50, ₹100, ₹250, ₹500, ₹1,000, or a custom amount.

The minimum amount is ₹20. Reject amounts below ₹20 in both frontend and backend validation.

### Step 2: Enter Donor Information

Collect full name, email address, mobile number, donation amount, selected campaign, optional message, and anonymous donation preference. Validate required fields before proceeding.

### Step 3: Create a Pending Donation

Before showing the payment QR or initiating checkout, create a donation/payment record with a unique donation ID, such as `SEVA-DON-2026-000123`.

Initial status: `PENDING`.

Store the amount, campaign, donor reference, creation time, and payment method. Never treat this initial record as a successful donation.

### Step 4: Display the Payment Method

Provide two payment options where configured.

#### Option A: UPI QR Payment

Display the active, admin-approved QR code. Show the QR image, donation amount, UPI ID, account/merchant name, campaign name, donation ID, payment instructions, and transaction-reference submission form.

Allow the donor to scan the QR using a UPI application. If the QR supports an amount, use an amount-specific QR where supported. Otherwise, clearly instruct the donor to enter the exact amount.

#### Option B: Payment Gateway

Provide secure checkout through the configured payment gateway, such as Razorpay or another supported provider. The backend must create the payment order and verify final payment status using the gateway's server-side verification mechanism and signed webhook events.

Do not assume that returning to a success URL means payment succeeded.

## 4. Payment Verification

### Automatic Gateway Verification

1. Create a server-side payment order.
2. Open the gateway checkout.
3. Receive the payment response.
4. Verify signatures where applicable.
5. Verify transaction status with the gateway or its authenticated webhook.
6. Confirm the transaction belongs to the correct donation and amount.
7. Mark the donation successful only after verification.
8. Generate the receipt and send notifications.

Validate the amount, currency, order ID, payment ID, merchant/account, and payment status against the stored transaction.

### Manual QR Payment Verification

1. Ask the donor to enter the UPI transaction/reference ID.
2. Optionally accept payment proof as supporting information.
3. Store the submission as `PENDING_VERIFICATION`.
4. Display that verification is in progress.
5. Notify the authorized Admin.
6. Verify against the actual merchant/bank transaction record or an authorized reconciliation source.
7. Allow approval or rejection with a recorded reason.
8. Update donation status only after the verification decision.

A screenshot, transaction ID, or donor claim is not sufficient proof by itself. If an authorized automated verification integration is unavailable, do not pretend verification is automatic.

## 5. Donation Statuses

Use a consistent status model:

- `PENDING`
- `PENDING_VERIFICATION`
- `PROCESSING`
- `SUCCESS`
- `FAILED`
- `REJECTED`
- `REFUND_PENDING`
- `REFUNDED`

Only verified successful payments may increase verified donation totals. Handle duplicate webhooks and repeated requests idempotently so a donation is never counted twice.

## 6. Payment Success Screen

After successful verification, display **🙏 Thank You for Supporting Seva!** and confirm the donation was received.

Show donation ID, donor name, amount, campaign, payment method, transaction reference, payment status, payment date, receipt download, dashboard link, and campaign link.

Example:

- **Amount:** ₹500
- **Donation ID:** `SEVA-DON-2026-000123`
- **Campaign:** Feed People in Need
- **Status:** Successful

Do not display this success state until the backend confirms payment. For manual QR payments, show a separate **Payment Submitted — Awaiting Verification** page.

## 7. Database Requirements

Inspect existing schemas before creating or modifying models.

### Donation

- Unique donation ID
- Donor/user reference, if available
- Donor name and contact information
- Campaign reference
- Amount and currency
- Payment method and donation status
- Creation and verification timestamps
- Receipt reference
- Anonymous donation preference

### Payment

- Unique internal payment ID
- Donation reference
- Gateway order ID, if applicable
- Gateway payment ID, if applicable
- UPI transaction/reference ID, if applicable
- Payment amount and currency
- Verification source and payment status
- Webhook/event reference
- Created/updated timestamps

### Payment Verification Record

- Donation/payment reference
- Submitted transaction reference
- Supporting proof reference, if supplied
- Verification status
- Reviewer and review timestamp
- Rejection reason, if applicable
- Audit metadata

Never store raw card details, UPI PINs, banking passwords, or other payment authentication secrets.

## 8. Admin Dashboard Integration

Add a Payment Management section to the existing Admin Dashboard:

- View donations and payment attempts
- Search by donation ID or transaction reference
- Filter by status, campaign, payment method, and date
- Review pending manual verification requests
- View payment details and supporting evidence
- Approve/reject manual verification requests
- Record rejection reasons
- View successful, failed, and refunded transactions
- View QR status and history
- Export authorized reports
- View payment audit logs

Only authorized Admin users may approve manual payments or change payment configuration. Record every verification decision in the audit log.

## 9. QR Code Management

Integrate with Seva's existing QR workflow. Authorized Volunteers may upload QR codes if current role permissions allow it.

Requirements: QR image, UPI ID, account name, uploader, upload timestamp, status, expiry date, Admin approval, activation/deactivation, QR history, and audit trail.

An uploaded QR must not automatically replace the active public QR. Validate image type and size, store images in approved storage, and never expose private storage credentials.

## 10. Donor Notifications

Trigger notifications only after the relevant backend state transition.

### Successful Payment SMS

> 🙏 Thank you for supporting Seva! Your donation of ₹{amount} has been successfully received. Donation ID: {donationId}. Campaign: {campaignName}. Your contribution helps us support people in need. — Team Seva

### Successful Payment Email

**Subject:** Your Seva Donation Was Successful

Include donor name, amount, donation ID, campaign, payment date, verified status, receipt link, dashboard link, and a thank-you message.

### Pending Verification SMS

> Thank you for donating ₹{amount} to Seva. Your payment submission is awaiting verification. Donation ID: {donationId}. We will notify you when the status is updated.

### Failed Payment SMS

> Your Seva donation payment could not be confirmed. Donation ID: {donationId}. If money was deducted, please contact Seva support and provide your transaction reference.

Use configurable SMS and email providers. Do not hardcode credentials. Log delivery attempts and retry temporary failures safely. Prevent duplicate success messages for repeated webhooks.

## 11. Receipt Generation

Generate a receipt only after successful payment verification.

Include Seva branding, Admin-configured organization details, donation ID, donor name subject to privacy preferences, amount, campaign, payment method, transaction reference where appropriate, payment date, receipt number, and applicable legal/tax information only when verified and authorized.

Provide a printable/downloadable receipt. Do not claim tax deductibility or issue an official tax-exemption receipt unless the organization is legally eligible and relevant details are verified.

## 12. Campaign and Donor Dashboard Updates

After successful verification, update donor donation history, campaign verified collected amount, successful donation count, receipt availability, notification history, and Admin analytics.

Do not count pending, rejected, or failed payments as received donations. Use database transactions or equivalent consistency safeguards where supported.

For refunds, retain the original donation and record the refund separately rather than deleting transaction history.

## 13. Security Requirements

Implement server-side amount validation, minimum donation of ₹20, authentication and RBAC, secure gateway integration, webhook/signature verification, idempotent processing, rate limiting, input validation, secure uploads, private storage for payment evidence, safe error handling, audit logs, environment variables for secrets, duplicate transaction detection, and protection against unauthorized status changes.

Never trust the frontend to decide that a donation succeeded. Never request a donor's UPI PIN, banking password, or payment app credentials.

## 14. Suggested API Responsibilities

Adapt these to the existing backend rather than creating duplicate APIs.

- `POST /api/donations` — create a pending donation
- `POST /api/payments/create-order` — create a gateway order
- `POST /api/payments/verify` — verify a gateway payment response
- `POST /api/payments/webhook` — process authenticated gateway events
- `POST /api/payments/submit-upi-reference` — submit a manual QR transaction reference
- `GET /api/donations/:id` — retrieve an authorized donation
- `GET /api/donations/:id/receipt` — retrieve a verified receipt
- `GET /api/admin/payments` — list authorized payment records
- `POST /api/admin/payments/:id/approve` — approve a manually verified payment
- `POST /api/admin/payments/:id/reject` — reject a manual verification request
- `GET /api/admin/payment-qr` — list QR configurations
- `POST /api/admin/payment-qr` — create/upload a QR record
- `PATCH /api/admin/payment-qr/:id` — update QR status

Apply authentication, authorization, validation, and audit logging to protected endpoints.

## 15. UI and UX Requirements

Create a clean, modern, trustworthy interface consistent with the existing Seva design. Include mobile-first responsive layouts, accessible forms, clear amount selection, loading indicators, error messages, pending/success/failure states, QR instructions, receipt download, and duplicate-submission prevention.

Do not redesign unrelated dashboards.

## 16. Implementation Checkpoints

### Checkpoint 1 — Repository Audit
Inspect the application and identify affected files/dependencies. Report proposed changes before implementation.

### Checkpoint 2 — Database and Validation
Implement required schema updates, unique IDs, and server-side ₹20 minimum validation.

### Checkpoint 3 — Donation UI
Implement donor details, amount selection, campaign selection, and payment-method selection.

### Checkpoint 4 — QR Workflow
Integrate approved QR display, reference submission, and manual verification status.

### Checkpoint 5 — Gateway Integration
Integrate the configured gateway, server-side order creation, payment verification, webhook handling, and idempotency.

### Checkpoint 6 — Success and Failure Screens
Implement verified success, pending verification, and failure pages.

### Checkpoint 7 — Admin Verification
Implement payment management, manual verification controls, and audit logging.

### Checkpoint 8 — Receipts and Notifications
Generate receipts and integrate SMS/email notifications with safe retries and duplicate prevention.

### Checkpoint 9 — Dashboard Synchronization
Update donor history, campaign totals, and Admin analytics from verified records only.

### Checkpoint 10 — Testing
Test minimum amounts, successful/failed payments, pending QR verification, invalid references, duplicate requests/webhooks, refunds, authorization, notification retries, and mobile layouts.

### Checkpoint 11 — Production Readiness
Check environment variables, HTTPS, gateway configuration, webhook endpoint, logging, backups, error handling, and deployment settings.

Do not deploy or make live payment configuration changes without the project owner's explicit permission.

## 17. Acceptance Criteria

The implementation is complete only when:

1. Donations below ₹20 are rejected by frontend and backend.
2. Donors can enter details and select a campaign.
3. A pending donation is created before payment.
4. Only approved QR codes are displayed.
5. Gateway payments are verified on the backend.
6. Manual QR payments remain pending until authorized verification.
7. Screenshots and transaction IDs alone cannot mark payments successful.
8. Verified donations receive a receipt and unique donation ID.
9. Donors receive the correct SMS/email status notification.
10. Duplicate webhooks cannot duplicate donations or notifications.
11. Campaign totals update only for verified successful donations.
12. Admin verification actions are authorized and audited.
13. Donor information and payment evidence are protected.
14. Existing dashboards and unrelated features continue working.
15. Tests pass and production secrets are not committed to the repository.

## 18. Final Instruction

Implement this payment module in the existing Seva repository, following the project documentation and completing each checkpoint in order.

After each checkpoint, report:
- Files created or modified
- Features completed
- Tests executed and results
- Known issues
- Next checkpoint

Fix errors before continuing. Do not fabricate successful payment verification, receipts, or notifications.

**At the end, provide a production-readiness report and wait for explicit permission before deploying or switching to live payments.**
