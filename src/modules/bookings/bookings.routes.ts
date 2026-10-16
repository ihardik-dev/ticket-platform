import { FastifyInstance } from "fastify";
import prisma from "../../lib/prisma.js";

export async function bookingRoutes(app: FastifyInstance) {
  app.post("/events/:eventId/bookings", async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    const body = request.body as {
      items: {
        ticketTypeId: number;
        quantity: number;
      }[];
    };

    // next: validate event + ticket types
  });
}