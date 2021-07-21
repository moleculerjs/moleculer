module.exports = {
	root: true,
	env: {
		node: true,
		commonjs: true,
		es6: true,
		jquery: false,
		jest: true,
		jasmine: false
	},
	extends: ["eslint:recommended", "plugin:security/recommended", "plugin:prettier/recommended"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: "2018"
	},
	plugins: ["node", "promise", "security"],
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
	ignorePatterns: ["benchmark/test.js", "test/typescript/hello-world/out/*.js"]
};
