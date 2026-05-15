export interface ServerConfig {
  host: string
  port: number
  mcpPublicBaseUrl: string
  siteBaseUrl: string
  sageApiBase: string
  mcpApiKey?: string
  allowedHosts: string[]
  allowedOrigins: string[]
}

function splitList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function readPort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10)
  if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) return parsed
  return 8787
}

export const config: ServerConfig = {
  host: process.env.HOST || "0.0.0.0",
  port: readPort(process.env.PORT),
  mcpPublicBaseUrl: process.env.MCP_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "http://localhost:8787",
  siteBaseUrl: process.env.SITE_BASE_URL || "https://www.ergoblockchain.org",
  sageApiBase: process.env.SAGE_API_BASE || "https://www.ergoblockchain.org",
  mcpApiKey: process.env.MCP_API_KEY || undefined,
  allowedHosts: splitList(process.env.ALLOWED_HOSTS, [
    "localhost",
    "127.0.0.1",
    "::1",
    "mcp.ergoblockchain.org",
  ]),
  allowedOrigins: splitList(process.env.ALLOWED_ORIGINS, [
    "https://www.ergoblockchain.org",
    "https://ergoblockchain.org",
  ]),
}
