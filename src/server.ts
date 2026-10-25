import app from "./app.js";
import "./workers/booking.worker.js";

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();