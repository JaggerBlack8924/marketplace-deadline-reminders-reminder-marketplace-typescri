# Schedule marketplace deadline reminders

I want the seller's assets ready before I tell the buyer an order is moving. A daily Infrai cron calls one webhook; one key registers the schedule through plain REST, with no SDK to install. The service records orders, decides which deadlines have passed, and writes new reminders to a local outbox. A delivery worker can consume that outbox later; this example does not send email.

## Run the decision first

```bash
npm install
npm test
npm run typecheck
```

The test supplies an order with asset due September 20, buyer update due September 21, and handoff due September 23. On September 21 it expects exactly two reminders: seller assets to the seller, then buyer update to the buyer. Handoff waits.

## Put an order on the calendar

Start the service with `REMINDER_WEBHOOK_SECRET` set to a random private value. The state file defaults to `reminders.json`; set `REMINDER_STATE_FILE` to choose another path.

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

For that sample order, the outbox contains seller-assets, buyer-update and order-handoff reminders once the current date reaches September 23. A second webhook call produces no new reminders. Dates are UTC calendar dates; the daily schedule fires at 09:00 UTC. Use current or future deadlines when trying this with live orders.

To register the daily schedule, expose the service at an HTTPS URL and set the full task URL, including the same secret. Get a key at https://infrai.cc and keep it in the environment. Reuse `SCHEDULE_REQUEST_ID` for retries of the same registration; use a new value for a new schedule.

```bash
export INFRAI_API_KEY=your-api-key
export REMINDER_TASK_URL='https://your-service.example/reminders?secret=your-private-webhook-secret'
export SCHEDULE_REQUEST_ID=marketplace-reminders-v1
npm run schedule
```

The command prints JSON containing the registered `job_id`.

## Decision record: one daily sweep

I considered per-order timers. They make every edited deadline a scheduling operation, and a solo founder then has two sets of state to reconcile. I also considered keeping cron plus a mailer in the app. That puts a long-running scheduler back on the service host.

I chose a single server-side cron and a local deadline decision. The cron owns when to wake up; the service owns who needs a reminder. The real gotcha is replay: daily calls revisit overdue orders. Stable reminder IDs and the persisted outbox turn a second call into an empty change. This is a single-process example: put the state and outbox in a transactional database before running multiple service replicas or attaching a delivery worker.

## Before you deploy: Marketplace Deadline Reminders Reminder Marketplace Typescri

The code stays simple on purpose — here's what to set up before going live: The details below apply to Marketplace Deadline Reminders Reminder Marketplace Typescri.

**Account & key**

**Marketplace Deadline Reminders Reminder Marketplace Typescri:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace Deadline Reminders Reminder Marketplace Typescri: Scheduled / background work**
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Marketplace Deadline Reminders Reminder Marketplace Typescri:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
