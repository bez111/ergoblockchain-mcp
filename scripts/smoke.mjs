#!/usr/bin/env node
const base = process.env.MCP_BASE_URL || "http://127.0.0.1:8787"

const health = await fetch(new URL("/health", base))
if (!health.ok) {
  throw new Error(`/health failed with HTTP ${health.status}`)
}

const payload = await health.json()
if (payload?.service !== "ergoblockchain-mcp") {
  throw new Error(`/health returned unexpected service: ${JSON.stringify(payload)}`)
}

console.log(`[smoke] ${base}/health OK`)
console.log(`[smoke] sage index: ${payload.sageIndex.documentCount} docs, generated ${payload.sageIndex.generatedAt}`)

