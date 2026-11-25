import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-dupe-else-if": "error",
      "no-constant-binary-expression": "error",
      "no-eval": "error",
      eqeqeq: ["error", "smart"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
