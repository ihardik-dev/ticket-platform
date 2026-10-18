import redis from "./redis.js";

export async function holdTickets(
  holdId: string,
  ticketTypeId: number,
  quantity: number,
  capacity: number,
) {
  const totalHeldKey = `ticket-type:${ticketTypeId}:held`;
  const holdKey = `hold:${holdId}:ticket-type:${ticketTypeId}`;

  const result = await redis.eval(
    `
    local currentHeld = tonumber(redis.call("GET", KEYS[1]) or "0")
    local quantity = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])

    if currentHeld + quantity > capacity then
      return 0
    end

    redis.call("INCRBY", KEYS[1], quantity)
    redis.call("SET", KEYS[2], quantity)

    return 1
    `,
    {
      keys: [totalHeldKey, holdKey],
      arguments: [String(quantity), String(capacity)],
    },
  );

  return result === 1;
}

export async function releaseTickets(
  holdId: string,
  ticketTypeId: number,
) {
  const totalHeldKey = `ticket-type:${ticketTypeId}:held`;
  const holdKey = `hold:${holdId}:ticket-type:${ticketTypeId}`;

  await redis.eval(
    `
    local quantity = tonumber(redis.call("GET", KEYS[2]) or "0")

    if quantity == 0 then
      return 0
    end

    redis.call("DECRBY", KEYS[1], quantity)
    redis.call("DEL", KEYS[2])

    return quantity
    `,
    {
      keys: [totalHeldKey, holdKey],
      arguments: [],
    },
  );
}