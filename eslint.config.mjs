import js from "@eslint/js"
import eslintConfigXo from "eslint-config-xo"
import eslintPluginPrettier from "eslint-plugin-prettier/recommended"
import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import typescriptEslint from "typescript-eslint"

export default typescriptEslint.config(
  { ignores: ["dist/"] },
  js.configs.recommended,
  { rules: eslintConfigXo.rules },
  eslintPluginUnicorn.configs["flat/recommended"],
  { plugins: { "simple-import-sort": eslintPluginSimpleImportSort } },
  ...typescriptEslint.configs.recommended,
  eslintPluginPrettier,
  {
    rules: {
      camelcase: ["error", { properties: "never" }],
      "capitalized-comments": "off",
      "no-await-in-loop": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
      "unicorn/filename-case": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },
)
