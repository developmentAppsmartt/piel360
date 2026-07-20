// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Base ESLint config compartida por api, web y mobile.
 * Cada app la extiende con `export default [...base, { ...overrides }]`.
 */
export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["dist/**", "build/**", ".next/**", ".expo/**", "node_modules/**"],
  },
);

export default base;
