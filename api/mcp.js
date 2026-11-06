const ORDERS = [
  { id: "mouse", item: "Logitech MX Vertical mouse", promised: "2026-10-15", reportedDelivery: "2026-10-21", status: "delivered, six days late" },
  { id: "licences", item: "Microsoft 365 Personal, five licences", ordered: "2026-09-25", reportedDelivery: "2026-10-25", status: "delivery reported thirty days after ordering" },
  { id: "extender", item: "TP-Link RE200 extender", promised: "2026-10-22", reportedDelivery: "2026-10-29", status: "delivered, seven days late" },
  { id: "stand", item: "Acer ZC.A01SI.179 laptop stand", firstPromised: "2026-10-21", promised: "2026-10-22", status: "original order cancelled 2026-11-04; replacement expected 2026-11-11" },
  { id: "trimmer", item: "Philips MG3760/33 trimmer", ordered: "2026-10-28", expected: "2026-11-04", status: "out for delivery at the 2026-11-06 review" }
];

const SUMMARY = [
  "Avoid Flipkart is an independent, documented account of five Flipkart orders placed in September and October 2026.",
  "The mouse arrived 6 days late and the extender 7 days late. Delivery of the Microsoft 365 licences was reported 30 days after ordering.",
  "The Acer stand was cancelled on 4 November with a replacement expected on 11 November.",
  "The Philips trimmer was still out for delivery on 6 November.",
  "Two complaints were marked resolved on 6 November; the Logitech issue remained open.",
  "No acknowledgement or closure notice for the 17 October grievance appears in the captured mail through 6 November.",
  "Source: https://avoidflipkart.com/"
].join(" ");

const TOOLS = [
  {
    name: "get_case_summary",
    description: "Return a short factual summary of the Avoid Flipkart customer case and its source URL.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "get_order_status",
    description: "Return the recorded status of one Flipkart order in the case.",
    inputSchema: {
      type: "object",
      properties: { order: { type: "string", enum: ORDERS.map((order) => order.id) } },
      required: ["order"],
      additionalProperties: false
    }
  }
];

function rpc(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolResult(text, isError) {
  return { content: [{ type: "text", text }], isError: Boolean(isError) };
}

function callTool(name, args) {
  if (name === "get_case_summary") return toolResult(SUMMARY);
  if (name === "get_order_status") {
    const order = ORDERS.find((entry) => entry.id === args?.order);
    if (!order) return toolResult("Unknown order. Use one of: " + ORDERS.map((entry) => entry.id).join(", "), true);
    return toolResult(JSON.stringify(order, null, 2));
  }
  return toolResult("Unknown tool: " + name, true);
}

const ALLOWED_ORIGINS = new Set(["https://avoidflipkart.com", "https://www.avoidflipkart.com"]);
const SUPPORTED_VERSIONS = new Set(["2025-06-18", "2025-03-26", "2024-11-05"]);

export default function handler(request, response) {
  const headers = request.headers || {};
  const origin = headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    response.status(403).json(error(null, -32000, "Origin not allowed."));
    return;
  }
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }
  if (request.method !== "POST") {
    response.status(405).setHeader("Allow", "POST, OPTIONS").json(error(null, -32000, "Use POST with JSON-RPC."));
    return;
  }

  const version = headers["mcp-protocol-version"];
  if (version && !SUPPORTED_VERSIONS.has(version)) {
    response.status(400).json(error(null, -32000, "Unsupported MCP-Protocol-Version: " + version));
    return;
  }

  const message = request.body;
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0") {
    response.status(400).json(error(null, -32600, "Invalid JSON-RPC request."));
    return;
  }
  if (message.id === undefined) {
    response.status(202).end();
    return;
  }

  const { id, method, params } = message;
  if (method === "initialize") {
    const requested = params?.protocolVersion;
    response.status(200).json(rpc(id, {
      protocolVersion: SUPPORTED_VERSIONS.has(requested) ? requested : "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "avoidflipkart", version: "1.0.0" }
    }));
    return;
  }
  if (method === "ping") {
    response.status(200).json(rpc(id, {}));
    return;
  }
  if (method === "tools/list") {
    response.status(200).json(rpc(id, { tools: TOOLS }));
    return;
  }
  if (method === "tools/call") {
    response.status(200).json(rpc(id, callTool(params?.name, params?.arguments)));
    return;
  }
  response.status(200).json(error(id, -32601, "Method not found: " + method));
}
