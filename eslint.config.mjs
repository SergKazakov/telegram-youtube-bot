import js from "@eslint/js"
import xo from "eslint-config-xo"
import prettier from "eslint-plugin-prettier/recommended"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import unicorn from "eslint-plugin-unicorn"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist/"] },
  js.configs.recommended,
  { rules: xo.rules },
  unicorn.configs["flat/recommended"],
  { plugins: { "simple-import-sort": simpleImportSort } },
  ...tseslint.configs.recommended,
  prettier,
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
