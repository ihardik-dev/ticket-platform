import Fastify from "fastify";
import { eventRoutes } from "./modules/events/events.routes.js";
import { ticketTypeRoutes } from "./modules/ticket-types/ticket-types.routes.js";


const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});
app.register(eventRoutes);
app.register(ticketTypeRoutes);

export default app;