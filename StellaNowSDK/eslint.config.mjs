// .eslintrc.js
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */
export default [
    // General configuration
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        ignores: ["dist/**", "build/**", "node_modules/**", "*.d.ts", "*.js"], // Ignore compiled output and declaration files
        languageOptions: {
            globals: {
                ...globals.node, // Use Node.js globals (e.g., process, require)
            },
            parserOptions: {
                sourceType: "module", // Support ES modules
                project: "./tsconfig.json", // Enable type-aware linting using your tsconfig
                tsconfigRootDir: import.meta.dirname, // Ensure project path resolution
            },
        },
    },

    // JavaScript recommended rules
    pluginJs.configs.recommended,

    // TypeScript strict and type-checked rules
    ...tseslint.configs.strict, // Stricter rules for TypeScript (includes recommended)
    ...tseslint.configs.recommendedTypeChecked, // Type-aware linting (requires project option)

    // Prettier integration to avoid conflicts with formatting
    prettier,

    // Custom rules and overrides
    {
        plugins: {
            import: pluginImport, // For import-related rules
        },
        rules: {
            // Enforce consistent imports
            "import/order": [
                "error",
                {
                    groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true },
                },
            ],
            "import/no-unresolved": "error", // Ensure imports resolve correctly
            "import/no-duplicates": "error", // Prevent duplicate imports

            // TypeScript-specific rules
            "@typescript-eslint/explicit-function-return-type": "error", // Require explicit return types on functions
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }], // Catch unused variables, ignore underscore-prefixed args
            "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }], // Customize no-explicit-any (removed duplicate)
            "@typescript-eslint/consistent-type-imports": "error", // Enforce `import type` for type-only imports
            "@typescript-eslint/no-unsafe-assignment": "error", // Prevent unsafe any assignments
            "@typescript-eslint/no-unsafe-member-access": "error", // Prevent unsafe member access on any types
            "@typescript-eslint/no-unsafe-call": "error", // Prevent unsafe calls on any types
            "@typescript-eslint/no-unsafe-return": "error", // Prevent unsafe returns of any types

            // Code style
            "quotes": ["error", "single", { avoidEscape: true }], // Enforce single quotes
            "semi": ["error", "always"], // Enforce semicolons
            "no-console": "warn", // Warn on console usage (adjust for production)

            // Disable rules that might conflict with your style or be too strict
            "@typescript-eslint/require-await": "off", // Allow async functions without await if needed
        },
    },

    // Test-specific configuration
    {
        files: ["**/*.test.ts", "**/*.spec.ts"],
        languageOptions: {
            globals: {
                ...globals.jest, // Add Jest globals (e.g., describe, it, expect)
            },
        },
        rules: {
            "no-console": "off", // Allow console in tests
            "@typescript-eslint/no-explicit-any": "off", // Relax any rule in tests if needed
        },
    },
];