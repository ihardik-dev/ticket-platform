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

    const event = await prisma.event.findUnique({
      where: {
        id: Number(eventId),
      },
    });

    if (!event) {
      return reply.code(404).send({
        message: "Event not found",
      });
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        id: {
          in: body.items.map((item) => item.ticketTypeId),
        },
        eventId: Number(eventId),
      },
    });

    if (ticketTypes.length !== body.items.length) {
      return reply.code(400).send({
        message: "Invalid ticket type",
      });
    }
});
}