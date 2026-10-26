import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import prisma from "../../lib/prisma.js";
import {
  holdTickets,
  releaseTickets,
} from "../../lib/inventory.js";
import { bookingQueue } from "../../queues/booking.queue.js";
import { BookingStatus } from "../../generated/prisma/enums.js";
import { canTransition } from "./booking.state.js";
import razorpay from "../../lib/razorpay.js";

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
            holdId,
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

      await bookingQueue.add(
        "expire-booking",
        {
          bookingId: booking.id,
        },
        {
          delay: 10 * 60 * 1000,
        },
      );

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

  app.get("/bookings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const booking = await prisma.booking.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        items: true,
      },
    });

    if (!booking) {
      return reply.code(404).send({
        message: "Booking not found",
      });
    }

    return booking;
  });

  app.post("/bookings/:bookingId/payments", async (request, reply) => {
    const { bookingId } = request.params as { bookingId: string };
    const id = Number(bookingId);

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return reply.code(404).send({
        message: "Booking not found",
      });
    }

    if (!canTransition(booking.status, BookingStatus.PENDING_PAYMENT)) {
      return reply.code(400).send({
        message: `Cannot initiate payment for booking with status ${booking.status}`,
      });
    }

    if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) {
      return reply.code(400).send({
        message: "Booking hold has expired",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: booking.totalAmount * 100,
      currency: "INR",
      receipt: `booking_${booking.id}`,
    });

    const paymentOrderId = razorpayOrder.id;

    const updated = await prisma.booking.updateMany({
      where: {
        id,
        status: BookingStatus.HELD,
      },
      data: {
        status: BookingStatus.PENDING_PAYMENT,
        paymentOrderId,
      },
    });

    if (updated.count === 0) {
      return reply.code(409).send({
        message: "Booking is no longer available for payment",
      });
    }

    return reply.code(200).send({
      bookingId: booking.id,
      status: BookingStatus.PENDING_PAYMENT,
      paymentOrderId,
      amount: booking.totalAmount,
      currency: "INR",
    });
  });
}
