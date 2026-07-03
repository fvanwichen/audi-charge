const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  const raw = await redis.get("laadwacht:session");
  if (!raw) return res.json({ ok: true, phase: "idle", session: null });
  const s = typeof raw === "string" ? JSON.parse(raw) : raw;
  const phase = (s.notified || Date.now() >= s.fireAt) ? "done" : "charging";
  res.json({ ok: true, phase,
    session: { start: s.start, durationMin: s.durationMin, currentPct: s.currentPct, targetPct: s.targetPct } });
};
