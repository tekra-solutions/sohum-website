# API reference

Every server entry point in the application, in one place.

There are two kinds, and the distinction matters when you go looking for them
in Chrome's Network tab:

| Kind | Count | How it is called | Appears in Network as |
|---|---|---|---|
| [Route handlers](#route-handlers) | 13 | A real URL — `fetch`, a link, a form `GET`, or Vercel Cron | What you expect: `GET /api/admin/export` |
| [Server actions](#server-actions) | 58 | Imported as a function and called directly from a component | `POST` to **the current page URL**, with a `Next-Action` header |

> **Why you do not see REST calls in the Network tab.** This app has almost no
> client-side `fetch`. Reads happen on the server while the page is rendered,
> and writes go through server actions. A server action posts to the page you
> are already on and identifies itself with a `Next-Action: <hash>` request
> header — so signing in looks like `POST /admin/login`, not
> `POST /api/auth/login`. See [Reading the Network tab](#reading-the-network-tab).

---

## Route handlers

Real HTTP endpoints. These are the only paths you can curl.

### Public — no session, secured by a secret token in the URL

| Method | Path | Purpose | Guard |
|---|---|---|---|
| `GET` | `/offer/[token]/pdf` | Candidate downloads their offer letter | `resolveOfferToken` — SHA-256 of the token must match a live offer, and the offer must not be expired |
| `GET` | `/invoice/[token]/pdf` | Client downloads their invoice | `resolveInvoiceToken`, same shape |
| `POST` | `/api/jobs/[id]/view` | Records a job-listing view | Same-origin check + rate limit (1 per job per IP per 30 min). Returns `204` always, so it leaks nothing |

The raw token is never stored — only its hash — so a database leak does not
yield working links. Tokens rotate whenever the underlying document is edited.

### Admin — requires a signed-in session

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/admin/export?type=&from=&to=` | CSV export. `type` is one of `applications`, `candidates`, `jobs`, `interviews` | session + `reports` |
| `GET` | `/api/admin/invoices/export` | CSV export of invoices, honouring the list filters | session + `invoices` |
| `GET` | `/api/admin/applications/[id]/resume` | Streams a résumé. `?download=1` forces a download | session + `candidates`. **Audited** |
| `GET` | `/admin/offers/[id]/preview` | The offer letter as standalone HTML | `requireOffer(id, "offers")` |
| `GET` | `/admin/offers/[id]/signed` | Redirect to a 60-second signed URL for the signed PDF | `requireOffer(id, "offers")`. **Audited** |
| `GET` | `/admin/promotions/[id]/preview` | The promotion letter as standalone HTML. `?version=` shows a specific version | `employees` |
| `GET` | `/admin/promotions/[id]/signed` | Redirect to a 60-second signed URL for the signed PDF | `employees`. **Audited** |
| `GET` | `/admin/invoices/[id]/preview` | The invoice as standalone HTML | `requireInvoice` |
| `GET` | `/admin/invoices/[id]/pdf` | The invoice PDF | `requireInvoice`. **Audited** |

Preview routes serve the *frozen* `renderedHtml` rather than re-rendering, so a
preview is byte-identical to what the recipient saw and to the PDF.

Stored PDFs live in a private bucket. These routes mint a short-lived signed
URL; the file is never publicly addressable.

### Scheduled

| Method | Path | Purpose | Guard |
|---|---|---|---|
| `GET` | `/api/cron/promotions` | Applies accepted promotions whose effective date has arrived | `Authorization: Bearer $CRON_SECRET`, compared in constant time |

Runs daily at `06:10 UTC` (`vercel.json`). Idempotent — a retry or an
overlapping run cannot double-apply. **Fails closed**: with `CRON_SECRET`
unset it returns `401` to everything, so promotions would never auto-apply.
Settings → Integrations shows whether it is configured.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP/api/cron/promotions
# {"ok":true,"considered":1,"applied":1,"failures":[],"durationMs":36}
```

---

## Server actions

Called as functions from components; Next.js turns each into a `POST` to the
current page. Grouped by the file that defines them.

### Authentication — `lib/services/auth-actions.ts`

| Action | Does | Guard |
|---|---|---|
| `loginAction` | Signs an admin in | Rate limited by IP and by email. **Audited** (success and failure) |
| `logoutAction` | Clears the session | session |

### Applications & candidates — `lib/ats/actions.ts`

| Action | Does | Permission |
|---|---|---|
| `candidateAction` | One entry point for stage, profile, star, assign, archive, notes, interviews, feedback, reminders (`kind` selects) | `candidates`, some `manage` |
| `bulkCandidateAction` | Stage / archive / assign across up to 100 candidates, all-or-nothing | `candidates`, assign needs `manage` |
| `emailCandidateAction` | Sends a templated email to a candidate | `candidates` |
| `saveEmailTemplateAction` | Creates or edits an email template | `settings` |
| `markNotificationAction` | Marks a notification read | session |

### Public application — `lib/services/submit-action.ts`

| Action | Does | Guard |
|---|---|---|
| `submitApplicationAction` | Public job application with résumé upload | Rate limited; validates file type and size (4 MB) |

### Jobs — `lib/services/job-actions.ts`, `lib/ats/job-actions.ts`

| Action | Does | Permission |
|---|---|---|
| `saveJobAction` | Creates or updates a job | `manage`. **Audited** |
| `setJobStatusAction` | Publish / unpublish / archive | `manage`. **Audited** |
| `deleteJobAction` | Deletes a job with no applications | `manage`. **Audited** |
| `jobWorkflowAction` | Approval workflow transitions | `manage` |
| `configureRecruitingAction` | Toggles the job approval requirement | `settings` |
| `configureOfferDefaultsAction` | Company offer defaults (representative, benefits, PTO) | `settings` |

### Offers — `lib/offers/actions.ts`, `lib/offers/templates-actions.ts`

| Action | Does | Permission |
|---|---|---|
| `createOfferAction` | Creates an offer and version 1. Refuses a second active offer | `offers`, scoped to an application you can access |
| `updateOfferAction` | Writes version N+1; returns to draft, rotates the token if already sent | `candidates` |
| `submitOfferForApprovalAction` | Draft → pending approval | `candidates` |
| `approveOfferAction` | Approves | `manage` |
| `rejectOfferAction` / `requestOfferChangesAction` | Sends back to draft with a note | `manage` |
| `sendOfferAction` | Emails the secure link. Cannot be unsent | `candidates` |
| `withdrawOfferAction` | Invalidates the link | `manage` |
| `extendOfferAction` | Moves the expiry only; terms and approval untouched | `manage` |
| `saveOfferTemplateAction` | Creates or edits a letter template | `settings` |
| `seedDefaultOfferTemplatesAction` | Loads starter templates, on explicit click | `settings` |

Every offer transition is audited.

### Offer signing (candidate) — `app/offer/[token]/actions.ts`

| Action | Does | Guard |
|---|---|---|
| `requestOtpAction` | Emails a 6-digit code | Token + rate limit per IP and per offer |
| `verifyOtpAction` | Verifies the code, mints a 30-minute session scoped to that one offer | Max 5 attempts per code |
| `acceptOfferAction` | Records the signature, freezes the accepted version, generates the signed PDF | Verified session; refuses a second signature |
| `declineOfferAction` | Records a decline with an optional reason | Verified session |

### Promotions — `lib/promotions/actions.ts`

| Action | Does | Permission |
|---|---|---|
| `createPromotionAction` | Creates a promotion and version 1. Refuses if nothing changed, or if one is already in flight | `employees` |
| `updatePromotionAction` | Writes version N+1; returns to draft, rotates the token if already sent | `employees` |
| `submitPromotionForApprovalAction` | Draft → pending approval | `employees` |
| `approvePromotionAction` | Approves | `manage` |
| `rejectPromotionAction` | Sends back to draft with a note | `manage` |
| `sendPromotionAction` | Emails the secure link to the employee's work address | `employees` |
| `withdrawPromotionAction` | Cancels — allowed even after signing, until it takes effect | `manage` |
| `applyPromotionAction` | Applies a due promotion to the employee record | `employees` |

### Promotion signing (employee) — `app/promotion/[token]/actions.ts`

Mirrors the offer signing flow exactly, with its own cookie and rate-limit keys:
`requestPromotionOtpAction`, `verifyPromotionOtpAction`,
`acceptPromotionAction`, `declinePromotionAction`.

`acceptPromotionAction` sets the promotion to **ACCEPTED, not EFFECTIVE** —
signing never changes an employee record. The cron job above, or an admin
pressing Apply, does that on the effective date.

### Employees — `lib/services/employee-actions.ts`

| Action | Does | Permission |
|---|---|---|
| `saveEmployeeAction` | Creates or updates an employee | `employees`. **Audited** |
| `setEmployeeStatusAction` | Active / on leave / terminated | `employees`. **Audited** |

### Invoices — `lib/invoices/actions.ts`, `lib/invoices/send-actions.ts`

| Action | Does | Permission |
|---|---|---|
| `saveInvoiceAction` | Creates or updates an invoice and its line items | `invoices` |
| `saveClientAction` | Creates or updates a billing client | `invoices` |
| `recordPaymentAction` | Records a payment; recomputes the balance | `invoices` |
| `voidInvoiceAction` | Voids an invoice, with a required reason | `invoices` |
| `reopenInvoiceAction` | Returns an invoice to draft; refused once a payment exists | `invoices` |
| `duplicateInvoiceAction` | Copies an invoice into a new draft | `invoices` |
| `generateInvoicePdfAction` | Renders and stores the PDF | `invoices` |
| `sendInvoiceAction` | Emails the secure invoice link | `invoices` |
| `sendInvoiceReminderAction` | Sends a payment reminder | `invoices` |
| `saveInvoiceSettingsAction` | Company billing settings | `settings` |

### Administration — `lib/services/admin-actions.ts`, `settings-actions.ts`

| Action | Does | Permission |
|---|---|---|
| `createAdminAction` | Creates an admin account | `SUPER_ADMIN`. **Audited** |
| `setAdminActiveAction` | Enables or disables an account | `SUPER_ADMIN`. **Audited** |
| `changePasswordAction` | Changes your own password | session. **Audited** |

---

## Reading the Network tab

**Filter by `Fetch/XHR` and look at the `POST` requests.** A server action
looks like this:

```
POST /admin/employees/3ac89127-…        ← the page you are on, not an API path
  Request headers:
    Next-Action: 60dd87b7ba4a1c…        ← which action ran (a build-time hash)
  Response:
    0:{"a":"$@1","f":"","b":"…"}        ← React Flight, not JSON
```

Practical notes:

- **The URL tells you nothing about what ran.** The `Next-Action` header does.
  Hover or open the request and read that header.
- **The response is not JSON.** It is the React Flight stream — the action's
  return value plus any re-rendered UI. Chrome shows it as text.
- **A page with no POST did its work on the server.** Reads happen during
  render, so opening a list or a detail screen shows a document request and
  nothing else. That is not a missing call.
- **Server actions are not a public API.** The action id is a build hash that
  changes on every deploy, and args are Flight-encoded. Integrations should use
  the route handlers above, or talk to the database directly.

To watch what a specific action does end to end, the audit log
(Admin → Audit log) is more useful than the Network tab: every mutation worth
tracking writes a row there with the actor, entity and metadata.

---

## Conventions

- **Permissions** come from `lib/ats/policy.ts` — `permits(role, permission)`.
  Roles: `SUPER_ADMIN`, `RECRUITING_ADMIN`, `RECRUITER`, `HIRING_MANAGER`.
  `manage` means approval authority.
- **Every mutation is guarded server-side.** Hiding a button is never the
  control; the action re-checks.
- **Multi-row changes run in one transaction** with `SELECT … FOR UPDATE` on
  the row being changed.
- **Documents are versioned, never edited.** Offer and promotion versions are
  insert-only; an edit writes N+1 and leaves the signed one frozen.
- **Money is integer cents** everywhere. Forms take dollars and convert at the
  boundary.
- **Audited actions** write to `audit_logs` with actor, entity type/id and
  metadata, visible at Admin → Audit log.
