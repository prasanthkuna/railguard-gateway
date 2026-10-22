/** Tiny .env editor for local scripts. Never prints values. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"

export function setEnvVar(path: string, name: string, value: string, overwrite = true): "added" | "updated" | "kept" {
  if (/[\r\n]/.test(value)) throw new Error(`${name}: value must be one line`)
  const text = existsSync(path) ? readFileSync(path, "utf8") : ""
  const lines = text.split(/\r?\n/)
  const idx = lines.findIndex((l) => l.startsWith(`${name}=`))
  if (idx >= 0) {
    if (!overwrite) return "kept"
    lines[idx] = `${name}=${value}`
    writeFileSync(path, lines.join("\n"))
    return "updated"
  }
  const sep = text.length === 0 || text.endsWith("\n") ? "" : "\n"
  writeFileSync(path, `${text}${sep}${name}=${value}\n`)
  return "added"
}
