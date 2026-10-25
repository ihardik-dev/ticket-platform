import { BookingStatus } from "../../generated/prisma/enums.js";

export const VALID_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.HELD]: [
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.PENDING_PAYMENT]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.CANCELLED]: [],
} as const;

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
