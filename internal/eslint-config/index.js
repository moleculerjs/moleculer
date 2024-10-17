import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
	files: ["**/*.{js,mjs,cjs,ts}"],

	extends: [pluginJs.configs.recommended, ...tseslint.configs.recommended],

	rules: {
		"@typescript-eslint/no-unused-vars": [
			"error",
			{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
		]
	}
});
