import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid date");

export const orderInput = z.object({
  orderId: z.string().min(1),
  sellerEmail: z.string().email(),
  buyerEmail: z.string().email(),
  assetDue: date,
  buyerUpdateDue: date,
  handoffDue: date
}).strict();

export type Order = z.infer<typeof orderInput>;
export type Reminder = { id: string; orderId: string; recipient: string; kind: "seller-assets" | "buyer-update" | "order-handoff"; due: string };

export function dueReminders(order: Order, today: string): Reminder[] {
  const candidates: Array<[Reminder["kind"], string, string]> = [
    ["seller-assets", order.assetDue, order.sellerEmail],
    ["buyer-update", order.buyerUpdateDue, order.buyerEmail],
    ["order-handoff", order.handoffDue, order.buyerEmail]
  ];
  return candidates.filter(([, due]) => due <= today).map(([kind, due, recipient]) => ({
    id: `${order.orderId}:${kind}`, orderId: order.orderId, recipient, kind, due
  }));
}
