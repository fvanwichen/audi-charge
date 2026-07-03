const webpush = require("web-push");
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if ((req.query.key || "") !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "bad key" });
  }

  const raw = await redis.get("laadwacht:session");
  if (!raw) return res.json({ ok: true, due: false });
  const s = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (s.notified) return res.json({ ok: true, due: false, phase: "done" });
  if (Date.now() < s.fireAt) {
    return res.json({ ok: true, due: false, minutesLeft: Math.ceil((s.fireAt - Date.now()) / 60000) });
  }

  const rawSub = await redis.get("laadwacht:sub");
  if (!rawSub) {
    return res.json({ ok: true, due: true, sent: false, error: "no stored subscription" });
  }
  const sub = typeof rawSub === "string" ? JSON.parse(rawSub) : rawSub;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let sent = false;
  try {
    await webpush.sendNotification(sub, JSON.stringify({
      title: "Verplaats de auto 🚗",
      body: "De Q3 is klaar met laden. Tik de sticker wanneer je 'm verplaatst hebt."
    }));
    sent = true;
  } catch (e) {
    console.error("push send failed:", e.statusCode, e.body || e.message);
  }

  s.notified = true; // keep session; app shows 'done' until you tap/stop
  await redis.set("laadwacht:session", JSON.stringify(s));
  res.json({ ok: true, due: true, sent });
};
