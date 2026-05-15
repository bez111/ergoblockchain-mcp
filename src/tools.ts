import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { config } from "./config.js"
import { askSage } from "./sage-client.js"
import { absoluteUrl, renderSearchResults, retrieve, sageIndexMeta } from "./retrieve.js"

function textContent(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  }
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ergoblockchain-mcp",
    version: "0.1.0",
  })

  server.registerTool(
    "search_ergo_docs",
    {
      title: "Search Ergo/Sage docs",
      description:
        "Search the local Ergo/Sage knowledge index and return cited excerpts with URLs.",
      inputSchema: {
        query: z.string().min(2).describe("Search query about Ergo, Sage, Accord, agent payments, eUTXO, Babel Fees, etc."),
        limit: z.number().int().min(1).max(10).default(5).describe("Maximum number of excerpts."),
      },
    },
    async ({ query, limit }) => {
      const results = retrieve(query, limit)
      return textContent(renderSearchResults(results, config.siteBaseUrl))
    },
  )

  server.registerTool(
    "ask_sage",
    {
      title: "Ask Sage",
      description:
        "Ask the public Sage chat API. Use quick mode for normal answers; deep mode may require payment on the upstream site.",
      inputSchema: {
        message: z.string().min(2).max(4000).describe("Question or task for Sage."),
        mode: z.enum(["quick", "deep"]).default("quick").describe("Sage answer mode."),
      },
    },
    async ({ message, mode }) => {
      const result = await askSage({ message, mode })
      if (result.status === 402) {
        return textContent(
          [
            "Sage returned HTTP 402 Payment Required for this request.",
            "Use quick mode, pay through the site widget, or call the Sage receipt flow directly on the web app.",
            result.text,
          ].join("\n\n"),
        )
      }

      if (result.status < 200 || result.status >= 300) {
        return textContent(`Sage returned HTTP ${result.status}.\n\n${result.text}`)
      }

      return textContent(result.text)
    },
  )

  server.registerTool(
    "get_sage_index_status",
    {
      title: "Get Sage index status",
      description: "Return the local Sage index metadata used by this MCP server.",
      inputSchema: {},
    },
    async () =>
      textContent(
        JSON.stringify(
          {
            generatedAt: sageIndexMeta.generatedAt,
            documentCount: sageIndexMeta.documentCount,
            mcpPublicBaseUrl: config.mcpPublicBaseUrl,
            siteBaseUrl: config.siteBaseUrl,
            sageApiBase: config.sageApiBase,
          },
          null,
          2,
        ),
      ),
  )

  server.registerTool(
    "get_sage_receipt_url",
    {
      title: "Get Sage receipt URL",
      description: "Build the public URL for a Sage payment or answer receipt id.",
      inputSchema: {
        receiptId: z.string().min(3).describe("Receipt id returned by the Sage payment flow."),
      },
    },
    async ({ receiptId }) => textContent(absoluteUrl(`/r/sage/${receiptId}`, config.siteBaseUrl)),
  )

  return server
}
