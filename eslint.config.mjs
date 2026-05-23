import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import { importX } from "eslint-plugin-import-x"
import eslintPluginPrettier from "eslint-plugin-prettier/recommended"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import typescriptEslint from "typescript-eslint"

export default defineConfig([
  js.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  ...typescriptEslint.configs.recommended,
  eslintPluginPrettier,
  {
    plugins: { "import-x": importX },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      camelcase: ["error", { properties: "never" }],
      "capitalized-comments": "off",
      "import-x/order": [
        "error",
        { "newlines-between": "always", alphabetize: { order: "asc" } },
      ],
      "no-await-in-loop": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      "unicorn/filename-case": "off",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
])
