import nodejsConfig from "@moleculer/eslint-config/nodejs.mjs";

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
	{
		ignores: ["dist/**"],
	},
	...nodejsConfig,
];
