/*
  Warnings:

  - Made the column `holdId` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "holdId" SET NOT NULL;
