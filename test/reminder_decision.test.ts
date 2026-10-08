import { test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { dueReminders, orderInput } from "../src/reminder_decision.js";

test("seller asset deadline precedes buyer update and handoff", () => {
  const order = orderInput.parse({
    orderId: "order-42", sellerEmail: "seller@example.com", buyerEmail: "buyer@example.com",
    assetDue: "2026-09-20", buyerUpdateDue: "2026-09-21", handoffDue: "2026-09-23"
  });
  deepStrictEqual(dueReminders(order, "2026-09-21"), [
    { id: "order-42:seller-assets", orderId: "order-42", recipient: "seller@example.com", kind: "seller-assets", due: "2026-09-20" },
    { id: "order-42:buyer-update", orderId: "order-42", recipient: "buyer@example.com", kind: "buyer-update", due: "2026-09-21" }
  ]);
});
