import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
    {
        ignores: ["**/node_modules/**", "dist/**", "build/**", "coverage/**"],
    },
    {
        files: ["**/*.js"],

        plugins: {
            js,
        },

        extends: ["js/recommended"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },

        rules: {
            "no-unused-vars": "error",
            "no-undef": "warn",
            "no-console": "warn",
        },
    },
]);
