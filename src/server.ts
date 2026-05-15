import cors from "cors"
import express, { type Request, type Response, type NextFunction } from "express"
import { randomUUID } from "node:crypto"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { config } from "./config.js"
import { createMcpServer } from "./tools.js"
import { sageIndexMeta } from "./retrieve.js"

type McpTransport = StreamableHTTPServerTransport

const transports = new Map<string, McpTransport>()

function normalizeHost(hostHeader: string | undefined): string {
  if (!hostHeader) return ""
  if (hostHeader.startsWith("[")) {
    const end = hostHeader.indexOf("]")
    return end >= 0 ? hostHeader.slice(1, end) : hostHeader
  }
  return hostHeader.split(":")[0]?.toLowerCase() ?? ""
}

function hostGuard(req: Request, res: Response, next: NextFunction) {
  const host = normalizeHost(req.headers.host)
  const allowed = config.allowedHosts.map((item) => item.toLowerCase())
  if (host && allowed.includes(host)) {
    next()
    return
  }

  res.status(421).json({
    error: "Misdirected Request",
    message: "Host header is not allowed for this MCP endpoint.",
  })
}

function authGuard(req: Request, res: Response, next: NextFunction) {
  if (!config.mcpApiKey) {
    next()
    return
  }

  const expected = `Bearer ${config.mcpApiKey}`
  if (req.headers.authorization === expected) {
    next()
    return
  }

  res.status(401).json({
    error: "Unauthorized",
    message: "Missing or invalid bearer token.",
  })
}

function sendJsonRpcError(res: Response, status: number, message: string) {
  res.status(status).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
    },
    id: null,
  })
}

function originAllowed(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true)
    return
  }

  if (config.allowedOrigins.includes("*") || config.allowedOrigins.includes(origin)) {
    callback(null, true)
    return
  }

  callback(new Error(`Origin ${origin} is not allowed by this MCP endpoint.`))
}

const app = express()

app.disable("x-powered-by")
app.use(hostGuard)
app.use(
  cors({
    origin: originAllowed,
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
)
app.use(express.json({ limit: "1mb" }))

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ergoblockchain-mcp",
    version: "0.1.0",
    transport: "streamable-http",
    mcpPublicBaseUrl: config.mcpPublicBaseUrl,
    siteBaseUrl: config.siteBaseUrl,
    sageIndex: sageIndexMeta,
  })
})

app.post("/mcp", authGuard, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"]
  const sessionKey = Array.isArray(sessionId) ? sessionId[0] : sessionId
  let transport: McpTransport | undefined

  if (sessionKey) {
    transport = transports.get(sessionKey)
    if (!transport) {
      sendJsonRpcError(res, 400, "Bad Request: unknown MCP session id.")
      return
    }
  } else if (isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        if (transport) transports.set(newSessionId, transport)
      },
    })

    transport.onclose = () => {
      if (transport?.sessionId) transports.delete(transport.sessionId)
    }

    const server = createMcpServer()
    await server.connect(transport)
  } else {
    sendJsonRpcError(res, 400, "Bad Request: initialize request or valid MCP session id required.")
    return
  }

  try {
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    console.error("[mcp] request failed", error)
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, "Internal Server Error")
    }
  }
})

async function handleSessionRequest(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"]
  const sessionKey = Array.isArray(sessionId) ? sessionId[0] : sessionId
  if (!sessionKey) {
    sendJsonRpcError(res, 400, "Bad Request: MCP session id required.")
    return
  }

  const transport = transports.get(sessionKey)
  if (!transport) {
    sendJsonRpcError(res, 400, "Bad Request: unknown MCP session id.")
    return
  }

  await transport.handleRequest(req, res)
}

app.get("/mcp", authGuard, handleSessionRequest)
app.delete("/mcp", authGuard, handleSessionRequest)

app.use((_req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "Use /health for health checks or /mcp for MCP Streamable HTTP.",
  })
})

app.listen(config.port, config.host, () => {
  console.log(`[mcp] listening on http://${config.host}:${config.port}`)
  console.log(`[mcp] public base ${config.mcpPublicBaseUrl}`)
  console.log(`[mcp] site base ${config.siteBaseUrl}`)
})
