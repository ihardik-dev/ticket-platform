import redis from "./redis.js";

export async function holdTickets(
  ticketTypeId: number,
  quantity: number,
  capacity: number,
) {
  const key = `ticket-type:${ticketTypeId}:held`;

  const result = await redis.eval(
    `
    local currentHeld = tonumber(redis.call("GET", KEYS[1]) or "0")

    if currentHeld + tonumber(ARGV[1]) > tonumber(ARGV[2]) then
      return 0
    end

    redis.call("INCRBY", KEYS[1], ARGV[1])

    return 1
    `,
    {
      keys: [key],
      arguments: [String(quantity), String(capacity)],
    },
  );

  return result === 1;
}