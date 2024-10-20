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

			// naming convention rules
			"@typescript-eslint/naming-convention": [
				"error",
				// camelCase for everything not otherwise indicated
				{ selector: "default", format: ["camelCase"] },
				// allow any naming convention for imports
				{ selector: "import", format: null },
				// allow unused parameters and variables that are only underscores
				{
					selector: ["parameter", "variable"],
					filter: { regex: "^_+$", match: true },
					modifiers: ["unused"],
					format: null,
				},
				// do not enforce format on property names
				{ selector: "property", format: null },
				{
					selector: ["class", "enum", "interface", "typeAlias"],
					format: ["PascalCase"],
				},
				// Generic type parameters in format of:
				// - Starts with T
				// - Followed by a capital letter
				// - Followed by any number of lowercase or uppercase letters, but never more than one consecutive uppercase letter
				// - Ends with a lowercase letter or number
				{
					selector: "typeParameter",
					format: null,
					custom: {
						regex: "^T[A-Z](?:[a-z]+[A-Z])*[a-z\\d]+$",
						match: true,
					},
				},
				// allow variables to be camelCase or UPPER_CASE
				{ selector: "variable", format: ["camelCase", "UPPER_CASE"] },
			],

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
