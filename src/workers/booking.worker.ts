import { Worker } from "bullmq";
import prisma from "../lib/prisma.js";
import { releaseTickets } from "../lib/inventory.js";

const worker = new Worker(
  "booking",
  async (job) => {
    const { bookingId } = job.data as { bookingId: number };

    await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: "HELD",
      },
      data: {
        status: "EXPIRED",
      },
    });

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        items: true,
      },
    });

    if (!booking || booking.status !== "EXPIRED") {
      return;
    }

    for (const item of booking.items) {
      await releaseTickets(
        booking.holdId,
        item.ticketTypeId,
      );
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  },
);