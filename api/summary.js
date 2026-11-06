const CASE = {
  site: "Avoid Flipkart",
  asOf: "2026-11-06",
  source: "https://avoidflipkart.com/",
  orders: [
    { item: "Logitech MX Vertical mouse", promised: "2026-10-15", reportedDelivery: "2026-10-21", status: "delivered", lateDays: 6 },
    { item: "Microsoft 365 Personal (5 licences)", ordered: "2026-09-25", reportedDelivery: "2026-10-25", status: "delivery reported", lateDays: 30 },
    { item: "TP-Link RE200 extender", promised: "2026-10-22", reportedDelivery: "2026-10-29", status: "delivered", lateDays: 7 },
    { item: "Acer ZC.A01SI.179 laptop stand", promised: "2026-10-22", originalOrderCancelled: "2026-11-04", replacementExpected: "2026-11-11", status: "replacement pending" },
    { item: "Philips MG3760/33 trimmer", ordered: "2026-10-28", expected: "2026-11-04", status: "out for delivery at review" }
  ],
  complaints: {
    markedResolvedOn: "2026-11-06",
    resolved: ["Acer delivery complaint", "TP-Link address change"],
    open: ["Logitech support issue"]
  },
  grievance: { sent: "2026-10-17", acknowledgementInCapturedMail: false },
  note: "Labels are transcribed as displayed in the account. The captures do not show who closed a case or why."
};

export default function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).setHeader("Access-Control-Allow-Origin", "*").end();
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(405).setHeader("Allow", "GET, HEAD, OPTIONS").json({ error: "method_not_allowed" });
    return;
  }
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  response.status(200).json(CASE);
}
