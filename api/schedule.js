const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { fireAt, sub } = req.body || {};
  if (!fireAt || !sub) return res.status(400).json({ error: "fireAt and sub required" });
  await redis.set("laadwacht:reminder", JSON.stringify({ fireAt, sub }));
  res.json({ ok: true, fireAt });
};
