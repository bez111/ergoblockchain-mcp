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

  for (const block of raw.split(/\r?\n\r?\n/)) {
    let eventName = "message"
    const dataLines: string[] = []

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice("event:".length).trim()
      if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim())
    }

    const payload = dataLines.join("\n")
    if (!payload || payload === "[DONE]") continue

    try {
      const parsed = JSON.parse(payload) as { type?: string; text?: string; message?: string; error?: string }
      const type = parsed.type ?? eventName
      if (type === "delta" && parsed.text) parts.push(parsed.text)
      if (type === "error") parts.push(`Error: ${parsed.message ?? parsed.error ?? "Sage stream error"}`)
    } catch {
      if (eventName === "delta") parts.push(payload)
    }
  }

  return parts.join("").trim()
}

function messageForMode(input: SageChatInput): string {
  const message = input.message.trim()
  if (input.mode === "deep" && !message.startsWith("/")) {
    return `/deep ${message}`
  }
  return message
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
          messages: [
            {
              role: "user",
              content: messageForMode(input),
            },
          ],
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
