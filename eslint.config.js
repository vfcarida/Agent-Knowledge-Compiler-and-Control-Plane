import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "packages/dashboard/**", // Uses oxlint
      "scratch/**",
    ],
  },
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    files: ["**/*.ts", "**/*.mjs", "**/*.js"],
    rules: {
      // TODO: Tighten these rules incrementally
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "off",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-unused-vars": ["off", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "no-console": ["off", { allow: ["warn", "error"] }],
      "no-undef": "off",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "no-unsafe-optional-chaining": "warn",
    },
  },
  {
    files: [
      "packages/core/src/capabilities/**/*.ts",
      "packages/core/src/policies/**/*.ts",
      "packages/core/src/policy/**/*.ts",
      "packages/core/src/privacy/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["scripts/**", "packages/cli/**"],
    rules: {
      "no-console": "off",
    },
  },
);
