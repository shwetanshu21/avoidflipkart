# Avoid Flipkart case API

Read-only JSON access to the order and complaint status documented on
https://avoidflipkart.com/. No authentication is required.

Reviewed through 6 November 2026. Statuses can change after that date.

## Endpoints

### `GET /api/summary`

Returns the five orders, their promised and reported dates, the two complaints
marked resolved on 6 November, the open Logitech issue, and the grievance status.

```bash
curl -s https://avoidflipkart.com/api/summary
```

### `GET /api/status`

Returns `{"status":"ok",...}` with the current time.

```bash
curl -s https://avoidflipkart.com/api/status
```

### `POST /api/mcp`

MCP Streamable HTTP endpoint (JSON-RPC 2.0). Tools:

- `get_case_summary` — short factual summary with the source URL.
- `get_order_status` — recorded status of one order. Arguments:
  `{"order":"mouse"|"licences"|"extender"|"stand"|"trimmer"}`.

```bash
curl -s https://avoidflipkart.com/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Server card: `/.well-known/mcp/server-card.json`
OpenAPI: `/.well-known/openapi.json`
Catalog: `/.well-known/api-catalog`

## Terms

This is an independent customer account, not affiliated with Flipkart Private
Limited or Walmart Inc. Attribute quotations to the case and keep the review
date. Labels such as "resolved" are transcribed from Flipkart's account pages;
the captured records do not show who closed a case or why.
