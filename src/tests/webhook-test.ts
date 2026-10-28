import assert from "node:assert/strict";
import crypto from "node:crypto";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { bookingQueue } from "../queues/booking.queue.js";
import { BookingStatus } from "../generated/prisma/enums.js";

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function runTest() {
  await app.ready();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "test_webhook_secret_key_123";

  // Setup test event & ticket type
  const event = await prisma.event.create({
    data: {
      name: "Webhook Test Event",
      venue: "Main Stadium",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: "General",
      price: 1000,
      capacity: 100,
    },
  });

  // Step 1: Create a booking and initiate payment
  const bookingRes = await app.inject({
    method: "POST",
    url: `/events/${event.id}/bookings`,
    payload: {
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    },
  });
  const booking = JSON.parse(bookingRes.body);

  const paymentRes = await app.inject({
    method: "POST",
    url: `/bookings/${booking.id}/payments`,
  });
  const paymentResult = JSON.parse(paymentRes.body);
  const orderId = paymentResult.paymentOrderId;

  const webhookPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_123456",
          order_id: orderId,
          status: "captured",
          amount: 100000,
        },
      },
    },
  });

  // Step 2: Test invalid signature rejection (Security)
  const invalidSigRes = await app.inject({
    method: "POST",
    url: "/payments/webhook",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": "invalid_fake_signature_hash",
    },
    payload: webhookPayload,
  });
  assert.equal(invalidSigRes.statusCode, 400);

  // Step 3: Test valid signature success (PENDING_PAYMENT -> CONFIRMED)
  const validSignature = signPayload(webhookPayload, secret);
  const validSigRes = await app.inject({
    method: "POST",
    url: "/payments/webhook",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": validSignature,
    },
    payload: webhookPayload,
  });
  assert.equal(validSigRes.statusCode, 200);

  // Verify DB state is now CONFIRMED
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
  });
  assert.equal(updatedBooking?.status, BookingStatus.CONFIRMED);

  // Step 4: Test Idempotency (Same webhook arriving second time)
  const duplicateRes = await app.inject({
    method: "POST",
    url: "/payments/webhook",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": validSignature,
    },
    payload: webhookPayload,
  });
  assert.equal(duplicateRes.statusCode, 200);

  // Step 5: Test State Machine Protection on EXPIRED booking
  const expiredBooking = await prisma.booking.create({
    data: {
      eventId: event.id,
      holdId: crypto.randomUUID(),
      paymentOrderId: "order_expired_test_999",
      status: BookingStatus.EXPIRED,
      totalAmount: 1000,
    },
  });

  const expiredWebhookPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_expired_123",
          order_id: expiredBooking.paymentOrderId,
          status: "captured",
          amount: 100000,
        },
      },
    },
  });

  const expiredWebhookRes = await app.inject({
    method: "POST",
    url: "/payments/webhook",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signPayload(expiredWebhookPayload, secret),
    },
    payload: expiredWebhookPayload,
  });
  // State machine must reject transition from EXPIRED to CONFIRMED
  assert.equal(expiredWebhookRes.statusCode, 409);

  console.log("All webhook tests passed successfully (Signature, State Transition, Idempotency, Expired Guard).");

  await bookingQueue.close();
  await prisma.$disconnect();
  await redis.quit();
  await app.close();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Webhook test failed:", err);
  process.exit(1);
});
