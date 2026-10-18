import redis from "./redis.js";

export async function holdTickets(
  ticketTypeId: number,
  quantity: number,
  capacity: number,
) {
  const key = `ticket-type:${ticketTypeId}:held`;

  const currentHeld = Number((await redis.get(key)) ?? 0);

  if (currentHeld + quantity > capacity) {
    return false;
  }

  await redis.incrBy(key, quantity);

  return true;
}
