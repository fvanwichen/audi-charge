const webpush = require("web-push");
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

// Defaults for NFC-started sessions (app settings don't reach the server)
const FULL_CHARGE_MIN = 225; // 0->100% in minutes (3u45)
const TARGET_PCT = 100;

const fmtNL = (ms) => new Date(ms).toLocaleTimeString("nl-NL",
  { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });

async function sendPush(title, body, sticky) {
  const rawSub = await redis.get("laadwacht:sub");
  if (!rawSub) return false;
  const sub = typeof rawSub === "string" ? JSON.parse(rawSub) : rawSub;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, sticky: !!sticky }));
    return true;
  } catch (e) {
    console.error("tap push failed:", e.statusCode, e.body || e.message);
    return false;
  }
}

module.exports = async (req, res) => {
  if ((req.query.key || "") !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "bad key" });
  }

  const raw = await redis.get("laadwacht:session");
  const s = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;

  if (s) {
    // Tap while charging or done -> stop / confirm moved
    await redis.del("laadwacht:session");
    await redis.del("laadwacht:reminder"); // legacy cleanup
    const wasDone = s.notified || Date.now() >= s.fireAt;
    const message = wasDone ? "Verplaatst — netjes op tijd ✅" : "Sessie gestopt 🔌";
    const sent = await sendPush(message, "Tik voor het dashboard.", false);
    return res.json({ ok: true, phase: "idle", message, pushSent: sent });
  }

  // Tap while idle -> start charging
  let pct = Number(req.query.pct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 99) pct = 40;
  const durationMin = Math.max(1, Math.round((TARGET_PCT - pct) / 100 * FULL_CHARGE_MIN));
  const start = Date.now();
  const fireAt = start + durationMin * 60000;
  const session = { start, durationMin, currentPct: pct, targetPct: TARGET_PCT, fireAt, notified: false };
  await redis.set("laadwacht:session", JSON.stringify(session));

  const message = `Gestart op ${pct}% — vol om ${fmtNL(fireAt)} ⚡`;
  const sent = await sendPush(message, "Tik voor het dashboard.", false);
  res.json({ ok: true, phase: "charging", message, pushSent: sent });
};
