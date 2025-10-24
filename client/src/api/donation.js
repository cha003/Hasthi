import client from "./client";

export function createDonationCheckout({ elephantId, amount, note }) {
  return client.post("/payments/checkout/donation", { elephantId, amount, note });
}

export async function getDonationReceipt(sessionId) {
  const { data } = await client.get("/payments/checkout/donation/receipt", {
    params: { session_id: sessionId },
  });
  return data;
}
