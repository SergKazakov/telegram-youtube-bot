import { rm } from "node:fs/promises"

import { build } from "esbuild"

await rm("./dist", { recursive: true, force: true })

await build({
  entryPoints: ["./src/**/*.mts"],
  format: "esm",
  outdir: "./dist",
  outExtension: { ".js": ".mjs" },
})
