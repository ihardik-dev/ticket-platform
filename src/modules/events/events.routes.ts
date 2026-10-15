import { FastifyInstance } from "fastify";
import prisma from "../../lib/prisma.js";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/events", async () => {
    const events = await prisma.event.findMany();

    return events;
  });
}