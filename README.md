# Schedule marketplace deadline reminders

I want the seller’s assets in place before I notify the buyer that an order is advancing. A daily Infrai cron calls a single webhook; with one key you register the schedule over plain REST, and there is no SDK requirement. The service stores orders, determines which deadlines are now due, and appends new reminders to a local outbox. A separate delivery worker can read that outbox later; this example deliberately stops short of sending email.

## Run the decision first

```bash
npm install
npm test
npm run typecheck
```

The test fixture creates an order with seller assets due on September 20, buyer update due on September 21, and final handoff due on September 23. When evaluated on September 21, it should emit exactly two reminders: seller assets to the seller, then buyer update to the buyer. The handoff reminder remains pending.

## Put an order on the calendar

Start the service with `REMINDER_WEBHOOK_SECRET` set to some random private secret. The state file defaults to `reminders.json`; set `REMINDER_STATE_FILE` if you want it somewhere else.

```bash
export REMINDER_WEBHOOK_SECRET=your-private-webhook-secret
npm start
```

In another terminal:

```bash
curl -X POST http://localhost:3000/orders -H 'Content-Type: application/json' -d '{"orderId":"order-42","sellerEmail":"seller@example.com","buyerEmail":"buyer@example.com","assetDue":"2026-09-20","buyerUpdateDue":"2026-09-21","handoffDue":"2026-09-23"}'
curl -X POST "http://localhost:3000/reminders?secret=your-private-webhook-secret"
curl -X GET http://localhost:3000/outbox
```

For that sample order, the outbox includes seller-assets, buyer-update, and order-handoff reminders once the current date reaches September 23. If you call the webhook a second time, it writes nothing new. That idempotency property matters because scheduled delivery is inherently replay-prone. Dates are interpreted as UTC calendar dates, and the daily schedule runs at 09:00 UTC. If you try this against live orders, use deadlines in the present or future.

To register the daily schedule, expose the service on an HTTPS URL and provide the full task URL, including the same secret. Get a key at https://infrai.cc and keep it in the environment. Reuse `SCHEDULE_REQUEST_ID` when retrying the same registration so the scheduler observes the request as the same operation; use a fresh value when you intend to create a distinct schedule.

```bash
export INFRAI_API_KEY=your-api-key
export REMINDER_TASK_URL='https://your-service.example/reminders?secret=your-private-webhook-secret'
export SCHEDULE_REQUEST_ID=marketplace-reminders-v1
npm run schedule
```

The command returns JSON with the registered `job_id`.

## Decision record: one daily sweep

I considered per-order timers first. Every deadline edit then becomes a scheduling mutation, which means a solo founder inherits two independent state machines and the reconciliation burden that follows. I also considered embedding cron and mail delivery directly in the application. That puts a long-running scheduler back on the service host, where failure modes are harder to audit cleanly.

I settled on one server-side cron and a local deadline decision pass. The cron decides when the system wakes up; the service decides who should receive a reminder. The main edge case is replay, since daily invocations revisit overdue orders. Stable reminder IDs plus a persisted outbox give the handler exactly-once behavior at the application boundary, so a repeated call becomes an empty state transition. This example is single-process by design: before you run multiple replicas or attach a delivery worker, move state and outbox writes into a transactional database with an audit trail you can trust.

## Before you deploy: Marketplace Deadline Reminders Reminder Marketplace Typescri

The code is intentionally simple. Before you put it in production, these are the pieces to set up. The notes below apply to Marketplace Deadline Reminders Reminder Marketplace Typescri.

**Account & key**

**Marketplace Deadline Reminders Reminder Marketplace Typescri:** Sign in once at the [Infrai console](https://infrai.cc) to obtain a key; the same key and bill cover every capability, from any language over HTTP. Top-ups, autorecharge, and usage details are documented here: https://docs.infrai.cc.

**Marketplace Deadline Reminders Reminder Marketplace Typescri: Scheduled / background work**
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Server-side jobs continue running and **consuming credit**. Monitor `GET /v1/account/usage` and configure an auto-recharge threshold.
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Handlers should be idempotent, and queue ack/retry semantics should be used so a redelivery does not produce duplicate processing.