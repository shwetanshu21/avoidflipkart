export default function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).setHeader("Access-Control-Allow-Origin", "*").end();
    return;
  }
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({ status: "ok", service: "avoidflipkart", checkedAt: new Date().toISOString() });
}
