# mcp.ergoblockchain.org DNS Runbook

Goal:

```text
https://mcp.ergoblockchain.org/health
https://mcp.ergoblockchain.org/mcp
```

Current live fallback:

```text
https://ergoblockchain-mcp.fly.dev/health
```

## DNS records

Use either the Fly A/AAAA pair:

```text
A    mcp.ergoblockchain.org -> 66.241.125.130
AAAA mcp.ergoblockchain.org -> 2a09:8280:1::116:b65b:0
```

Or the Fly CNAME target:

```text
CNAME mcp.ergoblockchain.org -> yk030zx.ergoblockchain-mcp.fly.dev
```

If DNS provider is proxied through a CDN, add ownership:

```text
TXT _fly-ownership.mcp.ergoblockchain.org -> app-yk030zx
```

For certificate issuance:

```text
CNAME _acme-challenge.mcp.ergoblockchain.org -> mcp.ergoblockchain.org.yk030zx.flydns.net
```

## Fly secrets

Production posture should include:

```bash
fly secrets set \
  MCP_PUBLIC_BASE_URL=https://mcp.ergoblockchain.org \
  SITE_BASE_URL=https://www.ergoblockchain.org \
  SAGE_API_BASE=https://www.ergoblockchain.org \
  ALLOWED_HOSTS=mcp.ergoblockchain.org,ergoblockchain-mcp.fly.dev \
  ALLOWED_ORIGINS=https://www.ergoblockchain.org,https://ergoblockchain.org
```

If public access should require auth:

```bash
fly secrets set MCP_API_KEY=<long-random-token>
```

## Verification

After DNS propagation:

```bash
dig +short mcp.ergoblockchain.org A
dig +short mcp.ergoblockchain.org AAAA
curl -fsS https://mcp.ergoblockchain.org/health
```

Expected health payload:

```json
{
  "ok": true,
  "service": "ergoblockchain-mcp",
  "transport": "streamable-http"
}
```

MCP endpoint:

```text
https://mcp.ergoblockchain.org/mcp
```

If `MCP_API_KEY` is set, clients must include:

```text
Authorization: Bearer <token>
```

## Live Hub gate

The website Live Hub probes both:

```text
https://ergoblockchain-mcp.fly.dev/health
https://mcp.ergoblockchain.org/health
```

The DNS gate opens only after the second URL returns `ok: true`.
