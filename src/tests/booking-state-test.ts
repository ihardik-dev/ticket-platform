import assert from "node:assert/strict";
import { BookingStatus } from "../generated/prisma/enums.js";
import { canTransition } from "../modules/bookings/booking.state.js";

// Valid transitions
assert.equal(canTransition(BookingStatus.HELD, BookingStatus.PENDING_PAYMENT), true);
assert.equal(canTransition(BookingStatus.HELD, BookingStatus.EXPIRED), true);
assert.equal(canTransition(BookingStatus.HELD, BookingStatus.CANCELLED), true);
assert.equal(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED), true);
assert.equal(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED), true);

// Invalid transitions
assert.equal(canTransition(BookingStatus.HELD, BookingStatus.CONFIRMED), false);
assert.equal(canTransition(BookingStatus.EXPIRED, BookingStatus.CONFIRMED), false);
assert.equal(canTransition(BookingStatus.EXPIRED, BookingStatus.HELD), false);
assert.equal(canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED), false);
assert.equal(canTransition(BookingStatus.CANCELLED, BookingStatus.HELD), false);
assert.equal(canTransition(BookingStatus.CONFIRMED, BookingStatus.EXPIRED), false);
assert.equal(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED), false);

// Terminal states must have zero outgoing transitions
for (const status of Object.values(BookingStatus)) {
  assert.equal(canTransition(BookingStatus.CONFIRMED, status), false);
  assert.equal(canTransition(BookingStatus.EXPIRED, status), false);
  assert.equal(canTransition(BookingStatus.CANCELLED, status), false);
}

console.log("All booking state transition tests passed.");
