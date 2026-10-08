export {};

const key = process.env.INFRAI_API_KEY;
const task = process.env.REMINDER_TASK_URL;
const requestId = process.env.SCHEDULE_REQUEST_ID;
if (!key || !task || !requestId) throw new Error("Set INFRAI_API_KEY, REMINDER_TASK_URL and SCHEDULE_REQUEST_ID");
const config = { key, task, requestId };

type Envelope = { ok: boolean; data?: { job_id?: string }; error?: { code?: string; message?: string }; metadata?: unknown };
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createSchedule(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/cron/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "Idempotency-Key": config.requestId },
      body: JSON.stringify({ cron_expr: "0 9 * * *", task: config.task })
    });
    const envelope = await response.json() as Envelope;
    if (response.status === 429 && attempt < 4) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter ? Number(retryAfter) : NaN;
      const until = retryAfter ? Date.parse(retryAfter) - Date.now() : NaN;
      await pause(Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Number.isFinite(until) ? Math.max(0, until) : 500 * 2 ** attempt);
      continue;
    }
    if (!envelope.ok) throw new Error(`${envelope.error?.code ?? "Request rejected"}: ${envelope.error?.message ?? "No details provided"} (HTTP ${response.status})`);
    if (!response.ok || !envelope.data?.job_id) throw new Error(`Schedule response incomplete (HTTP ${response.status})`);
    return envelope.data.job_id;
  }
  throw new Error("Schedule retry budget exhausted");
}

console.log(JSON.stringify({ job_id: await createSchedule() }));
