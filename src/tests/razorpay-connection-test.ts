import razorpay from "../lib/razorpay.js";

async function testConnection() {
  const order = await razorpay.orders.create({
    amount: 100,
    currency: "INR",
    receipt: "test_connection_receipt",
  });

  console.log("Razorpay test order created successfully:", order.id);
}

testConnection().catch((err) => {
  console.error("Razorpay test failed:", err);
  process.exit(1);
});
