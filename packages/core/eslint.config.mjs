import { nodejs } from "@moleculer/eslint-config/index.mjs";

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
	{
		ignores: ["dist/**"],
	},
	...nodejs,
];
