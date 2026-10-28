import { FastifyInstance, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import prisma from "../../lib/prisma.js";
import { BookingStatus } from "../../generated/prisma/enums.js";
import { canTransition } from "../bookings/booking.state.js";

interface RequestWithRawBody extends FastifyRequest {
  rawBody?: string;
}

export async function paymentRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const json = JSON.parse(body as string);
        (req as RequestWithRawBody).rawBody = body as string;
        done(null, json);
      } catch (err: any) {
        done(err, undefined);
      }
    },
  );

  app.post("/payments/webhook", async (request: RequestWithRawBody, reply) => {
    const signature = request.headers["x-razorpay-signature"] as string | undefined;
    if (!signature) {
      return reply.code(400).send({ message: "Missing x-razorpay-signature header" });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      return reply.code(500).send({ message: "Webhook secret is not configured" });
    }

    const rawBody = request.rawBody || JSON.stringify(request.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return reply.code(400).send({ message: "Invalid webhook signature" });
    }

    const body = request.body as any;
    const orderId =
      body.payload?.payment?.entity?.order_id ||
      body.payload?.order?.entity?.id;

    if (!orderId) {
      return reply.code(400).send({ message: "Missing order_id in webhook payload" });
    }

    const booking = await prisma.booking.findUnique({
      where: { paymentOrderId: orderId },
    });

    if (!booking) {
      return reply.code(404).send({ message: "Booking not found for order" });
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return reply.code(200).send({ status: "ok", message: "Booking already confirmed" });
    }

    if (!canTransition(booking.status, BookingStatus.CONFIRMED)) {
      return reply.code(409).send({
        message: `Cannot confirm booking with status ${booking.status}`,
      });
    }

    const updated = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: BookingStatus.PENDING_PAYMENT,
      },
      data: {
        status: BookingStatus.CONFIRMED,
      },
    });

    if (updated.count === 0) {
      return reply.code(200).send({ status: "ok", message: "Booking already processed" });
    }

    return reply.code(200).send({ status: "ok", message: "Booking confirmed successfully" });
  });
}
