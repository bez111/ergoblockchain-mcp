# Ergo Blockchain MCP Server

Remote MCP endpoint for Ergo/Sage tools, designed for `https://mcp.ergoblockchain.org/mcp`.

Current production app:

- Fly app: `ergoblockchain-mcp`
- Live Fly healthcheck: `https://ergoblockchain-mcp.fly.dev/health`
- Target public endpoint: `https://mcp.ergoblockchain.org/mcp`

The server uses MCP Streamable HTTP and exposes:

- `search_ergo_docs` - BM25 search over the local Sage/Ergo index with cited URLs.
- `ask_sage` - calls the public Sage chat API (`/api/sage/chat`).
- `get_sage_index_status` - reports the bundled index metadata.
- `get_sage_receipt_url` - builds a public Sage receipt URL.

The public `/mcp` surface should run with `MCP_API_KEY` set. The server also
caps in-memory Streamable HTTP sessions at 100 and prunes the oldest session
before accepting a new initialize request.

## Local Development

```bash
npm install
npm run sync:sage-index
npm run dev
```

Healthcheck:

```bash
curl http://127.0.0.1:8787/health
```

MCP endpoint:

```text
http://127.0.0.1:8787/mcp
```

## Configuration

Copy `.env.example` to `.env` in production.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, defaults to `8787`. |
| `HOST` | Bind host, defaults to `0.0.0.0`. |
| `MCP_PUBLIC_BASE_URL` | Public base URL for this MCP endpoint. |
| `SITE_BASE_URL` | Public Ergo site base used when rendering document and receipt links. |
| `SAGE_API_BASE` | Base URL for the website that serves `/api/sage/chat`. |
| `MCP_API_KEY` | Optional bearer token for `/mcp`. Strongly recommended before public exposure. |
| `ALLOWED_HOSTS` | Host header allowlist to reduce DNS-rebinding risk. |
| `ALLOWED_ORIGINS` | CORS allowlist for browser/proxy clients. |

## Docker

```bash
docker build -t ergoblockchain-mcp .
docker run --rm -p 8787:8787 --env-file .env ergoblockchain-mcp
```

## Deploy Shape

1. Deploy this repo as a small Node service.
2. Set production env:

```bash
MCP_PUBLIC_BASE_URL=https://mcp.ergoblockchain.org
SITE_BASE_URL=https://www.ergoblockchain.org
SAGE_API_BASE=https://www.ergoblockchain.org
ALLOWED_HOSTS=mcp.ergoblockchain.org
ALLOWED_ORIGINS=https://www.ergoblockchain.org,https://ergoblockchain.org
MCP_API_KEY=<long-random-token>
```

3. Point DNS. For the current Fly app, use either the recommended A/AAAA pair:

```text
A    mcp.ergoblockchain.org -> 66.241.125.130
AAAA mcp.ergoblockchain.org -> 2a09:8280:1::116:b65b:0
```

Or use the Fly CNAME target:

```text
CNAME mcp.ergoblockchain.org -> yk030zx.ergoblockchain-mcp.fly.dev
```

If certificate issuance is needed before routing traffic, add:

```text
CNAME _acme-challenge.mcp.ergoblockchain.org -> mcp.ergoblockchain.org.yk030zx.flydns.net
```

If the domain is proxied through a CDN, add the ownership record too:

```text
TXT _fly-ownership.mcp.ergoblockchain.org -> app-yk030zx
```

4. For Fly.io, copy `fly.toml.example` to `fly.toml`, set secrets, deploy:

```bash
fly secrets set MCP_API_KEY=<long-random-token>
fly deploy
```

5. Verify:

```bash
curl https://mcp.ergoblockchain.org/health
```

Detailed DNS and certificate checklist: [`docs/dns-runbook.md`](docs/dns-runbook.md).

6. Configure MCP clients with:

```text
https://mcp.ergoblockchain.org/mcp
```

If `MCP_API_KEY` is set, clients must send:

```text
Authorization: Bearer <token>
```

## Updating the Sage Index

From this repo:

```bash
ERGO_SITE_DIR=/Users/alexanderbezkrovny/Desktop/ergo_v0 npm run sync:sage-index
```

The site repo should run `npm run sage:index` first so `src/lib/sage/index.json` is fresh.
