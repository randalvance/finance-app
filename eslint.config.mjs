import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import neostandard from "neostandard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Neostandard config with TypeScript support and semicolons
  ...neostandard({
    ts: true,           // Enable TypeScript support
    semi: true,         // Enforce semicolons (overrides Standard's no-semi rule)
    noStyle: false,     // Keep style rules active
  }),

  // Next.js configs (these will layer on top)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Custom rule overrides
  {
    rules: {
      // Enforce double quotes for strings (override neostandard's single quotes)
      "@stylistic/quotes": ["error", "double", {
        avoidEscape: true,
        allowTemplateLiterals: true
      }],

      // Enforce semicolons (already handled by semi: true, but explicit)
      "@stylistic/semi": ["error", "always"],

      // Enforce 2 space indentation (already Standard default)
      "@stylistic/indent": ["error", 2, {
        SwitchCase: 1
      }],

      // Disable strict JSX indentation rules that conflict with Prettier-style formatting
      "@stylistic/jsx-indent": "off",
      "@stylistic/jsx-indent-props": "off",
      "@stylistic/jsx-closing-bracket-location": "off",
      "@stylistic/jsx-closing-tag-location": "off",

      // Disable strict multiline ternary (too opinionated)
      "@stylistic/multiline-ternary": "off",

      // Disable camelcase rule (APIs like Clerk use snake_case, fonts use underscores)
      camelcase: "off",

      // React-specific overrides
      "react/prop-types": "off",  // TypeScript handles this
      "react/react-in-jsx-scope": "off",  // Not needed in Next.js 13+
    },
  },

  // File ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "drizzle/**",
    ],
  },
];

export default eslintConfig;
