import { Queue } from "bullmq";

export const bookingQueue = new Queue("booking", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});