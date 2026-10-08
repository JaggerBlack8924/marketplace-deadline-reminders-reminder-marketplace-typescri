import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { orderInput, dueReminders, type Order, type Reminder } from "./reminder_decision.js";

type State = { orders: Order[]; outbox: Reminder[] };
const path = process.env.REMINDER_STATE_FILE ?? "reminders.json";
let state: State;
try { state = JSON.parse(await readFile(path, "utf8")) as State; }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  state = { orders: [], outbox: [] };
}

async function save() { await writeFile(path, JSON.stringify(state, null, 2) + "\n"); }

const server = createServer(async (req, res) => {
  const reply = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  try {
    if (req.method === "POST" && req.url === "/orders") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const parsed = orderInput.safeParse(JSON.parse(raw));
      if (!parsed.success) return reply(400, { error: parsed.error.flatten() });
      if (state.orders.some(order => order.orderId === parsed.data.orderId)) return reply(409, { error: "Order already recorded" });
      state.orders.push(parsed.data);
      await save();
      return reply(201, { orderId: parsed.data.orderId });
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "POST" && url.pathname === "/reminders") {
      if (!process.env.REMINDER_WEBHOOK_SECRET || url.searchParams.get("secret") !== process.env.REMINDER_WEBHOOK_SECRET)
        return reply(401, { error: "Unauthorized" });
      const today = new Date().toISOString().slice(0, 10);
      const known = new Set(state.outbox.map(item => item.id));
      const created = state.orders.flatMap(order => dueReminders(order, today)).filter(item => !known.has(item.id));
      state.outbox.push(...created);
      await save();
      return reply(200, { date: today, reminders: created });
    }
    if (req.method === "GET" && req.url === "/outbox") return reply(200, { reminders: state.outbox });
    return reply(404, { error: "Not found" });
  } catch (error) {
    if (error instanceof SyntaxError) return reply(400, { error: "Invalid JSON" });
    console.error(error);
    return reply(500, { error: "Unable to process request" });
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("Reminder service listening"));
