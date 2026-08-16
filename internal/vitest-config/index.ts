import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["**/?(*.)+(spec|test).?(c|m)[jt]s?(x)"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		coverage: {
			enabled: true,
			provider: "v8",
			include: ["src/**/*.ts"],
			reportsDirectory: "./coverage",
		},
	},
});
