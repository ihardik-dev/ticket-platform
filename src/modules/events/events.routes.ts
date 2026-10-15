import { FastifyInstance } from "fastify";
import prisma from "../../lib/prisma.js";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/events", async () => {
    const events = await prisma.event.findMany();

    return events;
  });

  app.post("/events", async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      venue: string;
      startsAt: string;
      endsAt: string;
    };

    const event = await prisma.event.create({
      data: {
        name: body.name,
        description: body.description,
        venue: body.venue,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
      },
    });

    return reply.code(201).send(event);
  });

  app.get("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const event = await prisma.event.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!event) {
      return reply.code(404).send({
        message: "Event not Found!",
      });
    }

    return event;
  });

  app.put("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const body = request.body as {
      name: string;
      description?: string;
      venue: string;
      startsAt: string;
      endsAt: string;
    };

    const event = await prisma.event.update({
      where: {
        id: Number(id),
      },

      data: {
        name: body.name,
        description: body.description,
        venue: body.venue,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
      },
    });

    return event;
  });
}