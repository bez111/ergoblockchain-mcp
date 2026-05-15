import { sageIndex, type SageDoc } from "./index-data.js"

export interface ScoredDoc extends SageDoc {
  score: number
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "she",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "you",
  "your",
  "would",
  "could",
  "should",
  "do",
  "does",
  "did",
  "not",
  "no",
  "yes",
  "so",
  "up",
  "out",
  "about",
])

interface PreparedDoc {
  doc: SageDoc
  termFreq: Map<string, number>
  length: number
}

const K1 = 1.5
const B = 0.75

let prepared: PreparedDoc[] | null = null
let avgDocLength = 0
let docFreq = new Map<string, number>()

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

function prepare(): PreparedDoc[] {
  if (prepared) return prepared

  prepared = sageIndex.docs.map((doc) => {
    const text = `${doc.title} ${doc.tags ?? ""} ${doc.content}`
    const tokens = tokenize(text)
    const termFreq = new Map<string, number>()
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1)
    }
    return { doc, termFreq, length: tokens.length }
  })

  const totalLength = prepared.reduce((sum, item) => sum + item.length, 0)
  avgDocLength = totalLength / Math.max(prepared.length, 1)

  docFreq = new Map()
  for (const item of prepared) {
    for (const term of item.termFreq.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
    }
  }

  return prepared
}

function scoreDoc(queryTokens: string[], doc: PreparedDoc, corpusSize: number): number {
  let score = 0

  for (const term of queryTokens) {
    const tf = doc.termFreq.get(term) ?? 0
    if (tf === 0) continue

    const df = docFreq.get(term) ?? 0
    const idf = Math.log(1 + (corpusSize - df + 0.5) / (df + 0.5))
    const norm = tf * (K1 + 1)
    const denom = tf + K1 * (1 - B + B * (doc.length / avgDocLength))
    score += idf * (norm / denom)
  }

  return score
}

export function retrieve(query: string, limit = 5): ScoredDoc[] {
  const docs = prepare()
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  return docs
    .map((item) => ({ ...item.doc, score: scoreDoc(queryTokens, item, docs.length) }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 10)))
}

export function absoluteUrl(pathOrUrl: string, publicBaseUrl: string): string {
  try {
    return new URL(pathOrUrl).toString()
  } catch {
    return new URL(pathOrUrl, publicBaseUrl).toString()
  }
}

export function renderSearchResults(docs: ScoredDoc[], publicBaseUrl: string): string {
  if (docs.length === 0) {
    return "No matching Ergo/Sage documents were found."
  }

  return docs
    .map((doc, index) => {
      const excerpt =
        doc.content.length > 900 ? `${doc.content.slice(0, 897).trimEnd()}...` : doc.content

      return [
        `${index + 1}. ${doc.title}`,
        `URL: ${absoluteUrl(doc.url, publicBaseUrl)}`,
        `Type: ${doc.type}`,
        `Score: ${doc.score.toFixed(3)}`,
        `Excerpt: ${excerpt}`,
      ].join("\n")
    })
    .join("\n\n")
}

export const sageIndexMeta = {
  generatedAt: sageIndex.generatedAt,
  documentCount: sageIndex.documentCount,
}

