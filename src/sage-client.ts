import { config } from "./config.js"

export interface SageChatInput {
  message: string
  mode?: "quick" | "deep"
}

export interface SageChatResult {
  text: string
  status: number
}

function parseSseText(raw: string): string {
  const parts: string[] = []

  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue
    const payload = line.slice("data:".length).trim()
    if (!payload || payload === "[DONE]") continue

    try {
      const parsed = JSON.parse(payload) as { type?: string; text?: string; error?: string }
      if (parsed.type === "delta" && parsed.text) parts.push(parsed.text)
      if (parsed.type === "error" && parsed.error) parts.push(`Error: ${parsed.error}`)
    } catch {
      parts.push(payload)
    }
  }

  return parts.join("").trim()
}

export async function askSage(input: SageChatInput): Promise<SageChatResult> {
  const endpoint = new URL("/api/sage/chat", config.sageApiBase)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        message: input.message,
        mode: input.mode ?? "quick",
      }),
      signal: controller.signal,
    })

    const raw = await response.text()
    const text =
      response.headers.get("content-type")?.includes("text/event-stream")
        ? parseSseText(raw)
        : raw

    return {
      status: response.status,
      text: text || `Sage returned HTTP ${response.status} with an empty body.`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

