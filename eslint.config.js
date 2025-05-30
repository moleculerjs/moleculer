const js = require("@eslint/js");
const globals = require("globals");
const pluginSecurity = require("eslint-plugin-security");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
	{ ignores: ["test/typescript/hello-world/out/*.js"] },
	js.configs.recommended,
	pluginSecurity.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			parserOptions: {
				sourceType: "module",
				ecmaVersion: 2023
			},
			globals: {
				...globals.node,
				...globals.es2020,
				...globals.commonjs,
				...globals.es6,
				...globals.jquery,
				...globals.jest,
				...globals.jasmine,
				process: "readonly",
				fetch: "readonly"
			}
		},
		// plugins: ["node", "security"],
		rules: {
			"no-var": ["error"],
			"no-console": ["error"],
			"no-unused-vars": ["warn"],
			"no-trailing-spaces": ["error"],
			"security/detect-object-injection": ["off"],
			"security/detect-non-literal-require": ["off"],
			"security/detect-non-literal-fs-filename": ["off"],
			"no-process-exit": ["off"],
			"node/no-unpublished-require": 0
		},
		ignores: ["benchmark/test.js"]
	},
	{
		files: ["test/**/*.js"],
		rules: {
			"no-console": ["off"],
			"no-unused-vars": ["off"]
		}
	},
	{
		files: ["dev/**/*.js", "benchmark/**/*.js", "examples/**/*.js"],
		rules: {
			"no-console": ["off"],
			"no-unused-vars": ["off"]
		}
	}
];
