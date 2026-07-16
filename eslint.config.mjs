import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
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
    plugins: { "@stylistic": stylistic, "import-x": importX },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "arrow-body-style": ["error", "as-needed"],
      camelcase: ["error", { properties: "never" }],
      "capitalized-comments": "off",
      "import-x/order": [
        "error",
        { "newlines-between": "always", alphabetize: { order: "asc" } },
      ],
      "no-await-in-loop": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "object-shorthand": ["error", "always"],
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      "unicorn/filename-case": "off",
      "unicorn/max-nested-calls": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-null": "off",
      "unicorn/no-top-level-assignment-in-function": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
])
