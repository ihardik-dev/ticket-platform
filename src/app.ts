import Fastify from "fastify";
import { eventRoutes } from "./modules/events/events.routes.js";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});
app.register(eventRoutes);

export default app;