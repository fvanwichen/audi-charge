const webpush = require("web-push");
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if ((req.query.key || "") !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "bad key" });
  }

  const raw = await redis.get("laadwacht:reminder");
  if (!raw) return res.json({ ok: true, due: false });

  const r = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (Date.now() < r.fireAt) {
    return res.json({ ok: true, due: false, minutesLeft: Math.ceil((r.fireAt - Date.now()) / 60000) });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let sent = false;
  try {
    await webpush.sendNotification(r.sub, JSON.stringify({
      title: "Verplaats de auto 🚗",
      body: "De Q3 is klaar met laden. Tik de sticker wanneer je 'm verplaatst hebt."
    }));
    sent = true;
  } catch (e) {
    console.error("push send failed:", e.statusCode, e.body || e.message);
  }

  await redis.del("laadwacht:reminder");
  res.json({ ok: true, due: true, sent });
};
