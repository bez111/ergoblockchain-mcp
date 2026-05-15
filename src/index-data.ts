import indexJson from "../data/sage-index.json" with { type: "json" }

export interface SageDoc {
  id: string
  type: "blog" | "page" | string
  url: string
  title: string
  tags?: string
  content: string
}

export interface SageIndexFile {
  generatedAt: string
  documentCount: number
  docs: SageDoc[]
}

export const sageIndex = indexJson as SageIndexFile

