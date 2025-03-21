import { defineConfig } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
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
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.commonjs,
            ...globals.jest,
        },
        parser: tsParser,
        ecmaVersion: 12,
        sourceType: "script",
    },
    rules: {},
}, {
    ignores: [
        'dist/',
        'lib/',
        'node_modules/',
        'jest.config.js',
        'repo/',
        'output/',
    ],
}]);
