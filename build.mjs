import { rm } from "node:fs/promises"

import { build } from "esbuild"
import { glob } from "glob"

await rm("./dist", { recursive: true, force: true })

await build({
  entryPoints: await glob("./src/**/*.mts"),
  format: "esm",
  outdir: "./dist",
  outExtension: { ".js": ".mjs" },
})
