import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { jsTsGlobs, tsGlobs } from "./globs.mjs";

export default tseslint.config(
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
	},
	{
		files: jsTsGlobs,
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			eslintConfigPrettier,
		],
		rules: {
			// enforce curly brace usage
			curly: ["error", "all"],

			// enforce consistent import sort order
			"sort-imports": ["error", { ignoreCase: true, ignoreDeclarationSort: true }],

			// prefer type imports and exports
			"@typescript-eslint/consistent-type-exports": "error",
			"@typescript-eslint/consistent-type-imports": "error",
			"@typescript-eslint/no-import-type-side-effects": "error",

			// enforce consistent order of class members
			"@typescript-eslint/member-ordering": "error",

			// disallow parameter properties in favor of explicit class declarations
			"@typescript-eslint/parameter-properties": "error",
		},
	},
	{
		files: tsGlobs,
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		rules: {
			// ban ts-comment except with description
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": { descriptionFormat: "^: " },
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],

			// force explicit member accessibility modifiers
			"@typescript-eslint/explicit-member-accessibility": "error",

			// enforce return types on module boundaries
			"@typescript-eslint/explicit-module-boundary-types": "error",

			// ban non-null assertions
			"@typescript-eslint/no-non-null-assertion": "error",

			// override @typescript-eslint/stylistic-type-checked to ignore booleans in nullish coalescing checks
			// https://typescript-eslint.io/rules/prefer-nullish-coalescing#ignoreprimitives
			"@typescript-eslint/prefer-nullish-coalescing": [
				"error",
				{ ignorePrimitives: { boolean: true } },
			],

			// prefer readonly modifier for unmodified private properties
			"@typescript-eslint/prefer-readonly": "error",

			// disallow boolean comparisons against non-boolean values
			"@typescript-eslint/strict-boolean-expressions": [
				"error",
				{ allowNullableBoolean: true },
			],
		},
	},
);
