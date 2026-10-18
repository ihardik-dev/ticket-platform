import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import prisma from "../../lib/prisma.js";
import {
  holdTickets,
  releaseTickets,
} from "../../lib/inventory.js";

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

    let totalAmount = 0;

    for (const item of body.items) {
      const selectedType = ticketTypes.find(
        (type) => type.id === item.ticketTypeId,
      );

      if (!selectedType) {
        return reply.code(400).send({
          message: "Invalid ticket type",
        });
      }

      totalAmount += selectedType.price * item.quantity;
    }

    const holdId = randomUUID();

    const heldItems: {
      ticketTypeId: number;
      quantity: number;
    }[] = [];

    for (const item of body.items) {
      const selectedType = ticketTypes.find(
        (type) => type.id === item.ticketTypeId,
      )!;

      const held = await holdTickets(
        holdId,
        selectedType.id,
        item.quantity,
        selectedType.capacity,
      );

      if (!held) {
        for (const heldItem of heldItems) {
          await releaseTickets(
            holdId,
            heldItem.ticketTypeId,
          );
        }

        return reply.code(409).send({
          message: `Not enough tickets available for ${selectedType.name}`,
        });
      }

      heldItems.push({
        ticketTypeId: selectedType.id,
        quantity: item.quantity,
      });
    }

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const newBooking = await (tx as any).booking.create({
          data: {
            eventId: Number(eventId),
            totalAmount,
            status: "HELD",
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        await (tx as any).bookingItem.createMany({
          data: body.items.map((item) => {
            const selectedType = ticketTypes.find(
              (type) => type.id === item.ticketTypeId,
            )!;

            return {
              bookingId: newBooking.id,
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: selectedType.price,
            };
          }),
        });

        return newBooking;
      });

      return reply.code(201).send(booking);
    } catch (error) {
      for (const heldItem of heldItems) {
        await releaseTickets(
          holdId,
          heldItem.ticketTypeId,
        );
      }

      throw error;
    }
  });
}