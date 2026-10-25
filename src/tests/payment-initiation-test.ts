import assert from "node:assert/strict";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

async function runTest() {
  await app.ready();

  // Create test event
  const event = await prisma.event.create({
    data: {
      name: "Payment Test Concert",
      venue: "Test Arena",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
    },
  });

  // Create test ticket type
  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: "VIP",
      price: 1500,
      capacity: 50,
    },
  });

  // 1. Create a booking (status HELD)
  const bookingResponse = await app.inject({
    method: "POST",
    url: `/events/${event.id}/bookings`,
    payload: {
      items: [
        {
          ticketTypeId: ticketType.id,
          quantity: 2,
        },
      ],
    },
  });

  assert.equal(bookingResponse.statusCode, 201);
  const booking = JSON.parse(bookingResponse.body);
  assert.equal(booking.status, "HELD");

  // 2. Initiate payment (HELD -> PENDING_PAYMENT)
  const paymentResponse = await app.inject({
    method: "POST",
    url: `/bookings/${booking.id}/payments`,
  });

  assert.equal(paymentResponse.statusCode, 200);
  const paymentResult = JSON.parse(paymentResponse.body);
  assert.equal(paymentResult.status, "PENDING_PAYMENT");
  assert.ok(paymentResult.paymentOrderId);
  assert.equal(paymentResult.amount, 3000);

  // 3. Verify in DB via GET /bookings/:id
  const getResponse = await app.inject({
    method: "GET",
    url: `/bookings/${booking.id}`,
  });
  assert.equal(getResponse.statusCode, 200);
  const fetchedBooking = JSON.parse(getResponse.body);
  assert.equal(fetchedBooking.status, "PENDING_PAYMENT");
  assert.equal(fetchedBooking.paymentOrderId, paymentResult.paymentOrderId);

  // 4. State Machine Guard: Attempting to initiate payment again must fail
  const duplicatePayment = await app.inject({
    method: "POST",
    url: `/bookings/${booking.id}/payments`,
  });
  assert.equal(duplicatePayment.statusCode, 400);

  console.log("Payment initiation and state transition test passed successfully.");

  await prisma.$disconnect();
  await redis.quit();
  await app.close();
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
