import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config({
	files: ["**/*.{js,mjs,cjs,ts}"],

	extends: [pluginJs.configs.recommended, ...tseslint.configs.recommended, pluginPrettier],

	rules: {
		"@typescript-eslint/no-unused-vars": [
			"error",
			{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
		]
	}
});
