#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const siteDir = resolve(process.env.ERGO_SITE_DIR || "../ergo_v0")
const source = resolve(siteDir, "src/lib/sage/index.json")
const target = resolve(root, "data/sage-index.json")

if (!existsSync(source)) {
  console.error(`[sync:sage-index] Missing source index: ${source}`)
  console.error("Set ERGO_SITE_DIR=/absolute/path/to/ergo_v0 if the site repo lives elsewhere.")
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)

const sizeKb = (statSync(target).size / 1024).toFixed(1)
console.log(`[sync:sage-index] copied ${source} -> ${target} (${sizeKb} KiB)`)

