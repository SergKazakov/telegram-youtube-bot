import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globalSetup: ["./src/testUtils/globalSetup.mts"],
    setupFiles: ["./src/testUtils/setupFiles.mts"],
  },
})
