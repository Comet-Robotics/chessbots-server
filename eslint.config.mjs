import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import tsParser from "@typescript-eslint/parser";
import reactRefresh from "eslint-plugin-react-refresh";
import tsdoc from "eslint-plugin-tsdoc";
import _import from "eslint-plugin-import";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: tsParser,
        parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            project: "./tsconfig.json",
            tsconfigRootDir: __dirname,
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    files: ["**/*.ts", "**/*.tsx"],

    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    )),

    plugins: {
        "react-refresh": reactRefresh,
        tsdoc,
        import: fixupPluginRules(_import),
    },

    rules: {
        "@typescript-eslint/no-unused-vars": "error",

        "react-refresh/only-export-components": ["warn", {
            allowConstantExport: true,
        }],

        "no-unused-vars": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: ".*",
        }],

        eqeqeq: "warn",
        "tsdoc/syntax": "warn",
        "import/no-cycle": "error",
        "@typescript-eslint/consistent-type-imports": "error",
    },

    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },

        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
}, globalIgnores(["**/dist", "**/.eslintrc.mjs", "vite.config.ts"])]);
