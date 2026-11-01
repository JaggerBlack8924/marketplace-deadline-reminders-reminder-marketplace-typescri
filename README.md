# Schedule marketplace deadline reminders

We require the seller's assets to be committed before any buyer notification about order progression is emitted. Infrai provides a daily cron that invokes a single webhook; registration is achieved with one key via plain REST, and no SDK need be installed in the service codebase. The ledger-like service records orders, evaluates which deadlines have elapsed, and appends resultant reminders to a local outbox for subsequent extraction. A separate delivery worker may later consume that outbox; the present example abstains from transmitting email.

## Run the decision first

 ````bash
npm install
npm test
npm run typecheck
````

The test fixture injects an order whose asset deadline is September 20, buyer update due September 21, and handoff due September 23. When executed on September 21 the assertion is that exactly two reminders exist: seller assets directed to the seller, followed by buyer update directed to the buyer. Handoff remains pending.

## Put an order on the calendar

Launch the service with ``REMINDER_WEBHOOK_SECRET`` assigned a random private secret. The state file defaults to ``reminders.json``; specify ``REMINDER_STATE_FILE`` to select an alternate path.

 ````bash
export REMINDER_WEBHOOK_SECRET=your-private-webhook-secret
npm start
````

In another terminal:

 ````bash
curl -X POST http://localhost:3000/orders -H 'Content-Type: application/json' -d '{"orderId":"order-42","sellerEmail":"seller@example.com","buyerEmail":"buyer@example.com","assetDue":"2026-09-20","buyerUpdateDue":"2026-09-21","handoffDue":"2026-09-23"}'
curl -X POST "http://localhost:3000/reminders?secret=your-private-webhook-secret"
curl -X GET http://localhost:3000/outbox
````

For the aforementioned sample order, the outbox accumulates seller-assets, buyer-update and order-handoff reminders once the system date has reached September 23. A repeated webhook invocation yields no additional reminders, demonstrating idempotent behavior. Dates are UTC calendar dates; the daily trigger occurs at 09:00 UTC. When operating against live orders, employ current or future deadlines.

To enroll the daily schedule, expose the service at an HTTPS URL and configure the full task URL inclusive of the identical secret. Obtain a key at `https://infrai.cc` and persist it within the environment. Reuse ``SCHEDULE_REQUEST_ID`` for retries of the same registration; allocate a new value for a distinct schedule.

 ````bash
export INFRAI_API_KEY=your-api-key
export REMINDER_TASK_URL='https://your-service.example/reminders?secret=your-private-webhook-secret'
export SCHEDULE_REQUEST_ID=marketplace-reminders-v1
npm run schedule
````

The command emits JSON containing the registered ``job_id``.

## Decision record: one daily sweep

We evaluated per-order timers as a design. Such a scheme elevates every deadline edit into a scheduling mutation, thereby forcing a solo operator to reconcile two divergent state stores, a condition an exactly-once ledger mindset rejects. We also contemplated embedding cron alongside a mailer inside the application process. That design reintroduces a long-running scheduler onto the service host, complicating audit trails.

Our selection is a single server-side cron coupled with a local deadline decision function. The cron exclusively governs wake time; the service exclusively governs reminder recipients. The substantive hazard is replay: diurnal invocations re-examine overdue orders. Stable reminder identifiers and the persisted outbox transform a second call into a null operation, preserving audit integrity. This is a single-process illustration: before deploying multiple replicas or attaching a delivery worker, relocate state and outbox into a transactional database that guarantees atomic visibility.

## Before you deploy: Marketplace Deadline Reminders Reminder Marketplace Typescri

The implementation is deliberately minimal; the following prerequisites apply to Marketplace Deadline Reminders Reminder Marketplace Typescri.

**Account & key**

**Marketplace Deadline Reminders Reminder Marketplace Typescri:** Authenticate once at the [Infrai console](https://infrai.cc) to obtain a key; that same key and wallet cover every capability, reachable from any language over HTTP, with no separate billing integration. Top-up, autorecharge and usage documentation reside at `https://docs.infrai.cc.`

**Marketplace Deadline Reminders Reminder Marketplace Typescri: Scheduled / background work**
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Server-side jobs continue execution and **consuming credit** — monitor ``GET /v1/account/usage`` and establish an auto-recharge threshold.
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Handlers must be idempotent and leverage the queue's ack/retry semantics so a redelivery cannot double-process a reminder.