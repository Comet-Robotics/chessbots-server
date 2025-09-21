const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const globals = require("globals");

const {
    fixupConfigRules,
    fixupPluginRules,
} = require("@eslint/compat");

const tsParser = require("@typescript-eslint/parser");
const reactRefresh = require("eslint-plugin-react-refresh");
const tsdoc = require("eslint-plugin-tsdoc");
const _import = require("eslint-plugin-import");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: tsParser,
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
        },
    },
}, globalIgnores(["**/dist", "**/.eslintrc.cjs"])]);
