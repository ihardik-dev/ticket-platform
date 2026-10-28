import Fastify from "fastify";
import { eventRoutes } from "./modules/events/events.routes.js";
import { ticketTypeRoutes } from "./modules/ticket-types/ticket-types.routes.js";
import { bookingRoutes } from "./modules/bookings/bookings.routes.js";
import { paymentRoutes } from "./modules/payments/payments.routes.js";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});
app.register(eventRoutes);
app.register(ticketTypeRoutes);
app.register(bookingRoutes);
app.register(paymentRoutes);

export default app;