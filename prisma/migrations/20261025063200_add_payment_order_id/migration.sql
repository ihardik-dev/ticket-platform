-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentOrderId_key" ON "Booking"("paymentOrderId");
