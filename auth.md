# auth.md

Agent access to the Avoid Flipkart case API.

## Audience

AI agents and automated clients reading the documented Flipkart order and
complaint status at https://avoidflipkart.com/.

## Registration

No registration is required. There is no sign-up, no API key, and no account.

## Supported method

Anonymous access over HTTPS. No credential is requested or accepted.

## Endpoints

- `GET https://avoidflipkart.com/api/summary` — case status as JSON.
- `GET https://avoidflipkart.com/api/status` — service health.
- `POST https://avoidflipkart.com/api/mcp` — MCP Streamable HTTP (JSON-RPC 2.0),
  exposing `get_case_summary` and `get_order_status`.

## Credential use

None. The API is public and read-only. If a future endpoint requires
authentication, this file will name the authorization server before that
endpoint is published.

## Contact

Corrections and attribution questions: the contact link on
https://avoidflipkart.com/.
