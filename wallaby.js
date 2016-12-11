module.exports = (wallaby) => {
	return {
		files: [
			"src/**/*.js",
		],
		tests: [
			"test/**/*.spec.js"
		],
		debug: true,

		env: {
			type: "node",
			runner: "node"
		},

		testFramework: "jest"
	};
};