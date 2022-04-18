module.exports = {
	useTabs: true,
	printWidth: 100,
	trailingComma: "none",
	tabWidth: 4,
	singleQuote: false,
	semi: true,
	bracketSpacing: true,
	arrowParens: "avoid",
	overrides: [
		{
			files: "*.md",
			options: {
				useTabs: false
			}
		},
		{
			files: "*.json",
			options: {
				tabWidth: 2,
				useTabs: false
			}
		}
	]
};
