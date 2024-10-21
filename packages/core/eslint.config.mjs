import nodejsConfig from "@moleculer/eslint-config/nodejs.mjs";

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
	{
		ignores: ["dist/**"],
	},
	...nodejsConfig,

	// Override for example files
	{
		files: ["examples/**/*.{ts,js}"],
		rules: {
			"no-undef": "off",
			"no-unused-vars": "off",
			"no-console": "off",
		},
	},
];
