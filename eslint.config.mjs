import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add custom rules here
  {
    rules: {
      // Allow unused variables and arguments prefixed with an underscore
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error" if you prefer stricter checks
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Add other custom rules if needed
    },
  },
  // Add configuration specifically for .js files to allow require()
  {
    files: ["*.js", "*.cjs", "*.mjs"], // Target JS, CommonJS, and Module JS files for config
    rules: {
      "@typescript-eslint/no-var-requires": "off", // Allow require()
      "import/no-commonjs": "off", // Also allow CommonJS patterns like require/module.exports
      "no-require-imports": "off", // Explicitly disable no-require-imports rule
      "@typescript-eslint/no-require-imports": "off", // Disable TypeScript version if it exists
    },
  },
];

export default eslintConfig;
