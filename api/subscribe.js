const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { sub } = req.body || {};
  if (!sub || !sub.endpoint) return res.status(400).json({ error: "sub required" });
  await redis.set("laadwacht:sub", JSON.stringify(sub));
  res.json({ ok: true });
};
