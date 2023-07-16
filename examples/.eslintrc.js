module.exports = {
	env: {
		node: true,
		commonjs: true,
		es6: true
	},
	extends: ["eslint:recommended"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2018
	},
	rules: {
		"no-var": ["warn"],
		"no-console": ["off"],
		"no-unused-vars": ["off"],
		"no-mixed-spaces-and-tabs": ["off"],
		"security/detect-possible-timing-attacks": ["off"]
	}
};
