// import type { JestConfigWithTsJest } from "ts-jest";

//const config: JestConfigWithTsJest = {
const config = {
	testEnvironment: "node",
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: "<rootDir>/../tsconfig.test.json",
			},
		],
	},
	testMatch: [
		"**/?(*.)+(spec|test).?([cm])[jt]s?(x)",
		"!**/dist/**/*", // ignore dist
	],
	collectCoverage: true,
	coverageDirectory: "<rootDir>/../coverage",
	collectCoverageFrom: ["src/**/*.ts"],
	cache: false,
	setupFiles: [],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};

export default config;
