const { Redis } = require("@upstash/redis");
let redis = null;

const getRedis = () => {
  if (!redis) {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.warn("⚠️  Redis not configured — using in-memory cache fallback");
      return null;
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
};

const verifyRedisConnection = async () => {
  try {
    const client = getRedis();
    if (!client) return false;
    await client.ping();
    console.log("🔴 Redis connected successfully (Upstash)");
    return true;
  } catch (error) {
    console.warn("⚠️  Redis connection failed:", error.message);
    return false;
  }
};

module.exports = { getRedis, verifyRedisConnection };
