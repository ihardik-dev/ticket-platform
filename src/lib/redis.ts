import { createClient } from "redis";

const redis = createClient({
  url: "redis://localhost:6379",
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

await redis.connect();

export default redis;