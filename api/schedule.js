const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { fireAt, session, sub } = req.body || {};
  if (!fireAt || !session) return res.status(400).json({ error: "fireAt and session required" });
  await redis.set("laadwacht:session", JSON.stringify({ ...session, fireAt, notified: false }));
  if (sub && sub.endpoint) await redis.set("laadwacht:sub", JSON.stringify(sub));
  res.json({ ok: true, fireAt });
};
