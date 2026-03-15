import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.{js,jsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": hooksPlugin
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2021,
                sourceType: "module"
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": "warn",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off"
        }
    }
];
