import { holdTickets } from "../lib/inventory.js";
import redis from "../lib/redis.js";

const capacity = 100;

// Start clean
await redis.del("ticket-type:2:held");

const requests = Array.from({ length: 1000 }, () =>
  holdTickets(2, 1, capacity),
);

const results = await Promise.all(requests);

const successful = results.filter(Boolean).length;
const held = await redis.get("ticket-type:2:held");

console.log("Successful holds:", successful);
console.log("Redis held count:", held);

await redis.quit();