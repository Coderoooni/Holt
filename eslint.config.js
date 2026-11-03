import tsParser from "@typescript-eslint/parser";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ...betterTailwindcss.configs.recommended,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/index.css",
        detectComponentClasses: true,
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      // Prettier owns line width; this rule re-wraps class strings against its own limit.
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
  },
];
