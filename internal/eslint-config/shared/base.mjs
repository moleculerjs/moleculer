import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
// @ts-expect-error: No declaration file for eslint-plugin-import
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import { tsGlobs } from "./globs.mjs";

export default tseslint.config(
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			importPlugin.flatConfigs.recommended,
			importPlugin.flatConfigs.typescript,
		],
		rules: {
			// enforce return statements in callbacks of array methods
			// https://eslint.org/docs/latest/rules/array-callback-return
			"array-callback-return": ["error", { allowImplicit: true }],

			// require return statements to either always or never specify values
			// https://eslint.org/docs/latest/rules/consistent-return
			"consistent-return": "error",

			// enforce consistent brace style for all control statements
			// https://eslint.org/docs/latest/rules/curly
			curly: ["error", "all"],

			// require default case in switch statements
			// https://eslint.org/docs/latest/rules/default-case
			"default-case": ["error", { commentPattern: "^no default$" }],

			// enforce default clauses in switch statements to be last
			// https://eslint.org/docs/latest/rules/default-case-last
			"default-case-last": "error",

			// require the use of === and !==
			// https://eslint.org/docs/latest/rules/eqeqeq
			eqeqeq: ["error", "always", { null: "ignore" }],

			// require or disallow named function expressions
			// https://eslint.org/docs/latest/rules/func-names
			"func-names": "warn",

			// require grouped accessor pairs in object literals and classes
			// https://eslint.org/docs/latest/rules/grouped-accessor-pairs
			"grouped-accessor-pairs": "error",

			// require for-in loops to include an if statement
			// https://eslint.org/docs/latest/rules/guard-for-in
			"guard-for-in": "error",

			// enforce a maximum number of classes per file
			// https://eslint.org/docs/latest/rules/max-classes-per-file
			"max-classes-per-file": ["error", 1],

			// require constructor names to begin with a capital letter
			// https://eslint.org/docs/latest/rules/new-cap
			"new-cap": ["error", { newIsCap: true, capIsNew: false }],

			// disallow await inside of loops
			// https://eslint.org/docs/latest/rules/no-await-in-loop
			"no-await-in-loop": "error",

			// disallow bitwise operators
			// https://eslint.org/docs/latest/rules/no-bitwise
			"no-bitwise": "error",

			// disallow use of arguments.caller or arguments.callee
			// https://eslint.org/docs/latest/rules/no-caller
			"no-caller": "error",

			// disallow assignment operators in conditional expressions
			// https://eslint.org/docs/latest/rules/no-cond-assign
			"no-cond-assign": ["error", "always"],

			// disallow the use of console
			// https://eslint.org/docs/latest/rules/no-console
			"no-console": "warn",

			// disallow returning value from constructor
			// https://eslint.org/docs/latest/rules/no-constructor-return
			"no-constructor-return": "error",

			// disallow continue statements
			// https://eslint.org/docs/latest/rules/no-continue
			"no-continue": "error",

			// disallow else blocks after return statements in if statements
			// https://eslint.org/docs/latest/rules/no-else-return
			"no-else-return": ["error", { allowElseIf: false }],

			// disallow the use of eval()
			// https://eslint.org/docs/latest/rules/no-eval
			"no-eval": "error",

			// disallow unnecessary labels
			// https://eslint.org/docs/latest/rules/no-extra-label
			"no-extra-label": "error",

			// disallow variable or function declarations in nested blocks
			// https://eslint.org/docs/latest/rules/no-inner-declarations
			"no-inner-declarations": "error",

			// disallow labels that share a name with a variable
			// https://eslint.org/docs/latest/rules/no-label-var
			"no-label-var": "error",

			// disallow use of labels for anything other than loops and switches
			// https://eslint.org/docs/latest/rules/no-labels
			"no-labels": ["error", { allowLoop: false, allowSwitch: false }],

			// disallow if statements as the only statement in else blocks
			// https://eslint.org/docs/latest/rules/no-lonely-if
			"no-lonely-if": "error",

			// disallow use of chained assignment expressions
			// https://eslint.org/docs/latest/rules/no-multi-assign
			"no-multi-assign": "error",

			// disallow multiline strings
			// https://eslint.org/docs/latest/rules/no-multi-str
			"no-multi-str": "error",

			// disallow nested ternary expressions
			// https://eslint.org/docs/latest/rules/no-nested-ternary
			"no-nested-ternary": "error",

			// disallow new operators outside of assignments or comparisons
			// https://eslint.org/docs/latest/rules/no-new
			"no-new": "error",

			// disallow new operators with the String, Number, and Boolean objects
			// https://eslint.org/docs/latest/rules/no-new-wrappers
			"no-new-wrappers": "error",

			// disallow calls to the Object constructor without an argument
			// https://eslint.org/docs/latest/rules/no-object-constructor
			"no-object-constructor": "error",

			// disallow reassigning function parameters
			// disallow parameter object manipulation except for specific exclusions
			// https://eslint.org/docs/latest/rules/no-param-reassign
			"no-param-reassign": [
				"error",
				{
					props: true,
					ignorePropertyModificationsFor: [
						"acc", // for reduce accumulators
					],
				},
			],

			// disallow the unary operators ++ and --
			// https://eslint.org/docs/latest/rules/no-plusplus
			"no-plusplus": "error",

			// disallow returning values from Promise executor functions
			// https://eslint.org/docs/latest/rules/no-promise-executor-return
			"no-promise-executor-return": "error",

			// disallow the use of the __proto__ property
			// https://eslint.org/docs/latest/rules/no-proto
			"no-proto": "error",

			// disallow specified names in exports
			// https://eslint.org/docs/latest/rules/no-restricted-exports
			"no-restricted-exports": [
				"error",
				{
					restrictedNamedExports: [
						"default", // use `export default` to provide a default export
						"then", // this will cause tons of confusion when your module is dynamically `import()`ed, and will break in most node ESM versions
					],
				},
			],

			// disallow assignment operators in return statements
			// https://eslint.org/docs/latest/rules/no-return-assign
			"no-return-assign": ["error", "always"],

			// disallow javascript: urls
			// https://eslint.org/docs/latest/rules/no-script-url
			"no-script-url": "error",

			// disallow comparisons where both sides are exactly the same
			// https://eslint.org/docs/latest/rules/no-self-compare
			"no-self-compare": "error",

			// disallow comma operators
			// https://eslint.org/docs/latest/rules/no-sequences
			"no-sequences": "error",

			// disallow template literal placeholder syntax in regular strings
			// https://eslint.org/docs/latest/rules/no-template-curly-in-string
			"no-template-curly-in-string": "error",

			// disallow initializing variables to undefined
			// https://eslint.org/docs/latest/rules/no-undef-init
			"no-undef-init": "error",

			// disallow ternary operators when simpler alternatives exist
			// https://eslint.org/docs/latest/rules/no-unneeded-ternary
			"no-unneeded-ternary": ["error", { defaultAssignment: false }],

			// disallow loops with a body that allows only one iteration
			// https://eslint.org/docs/latest/rules/no-unreachable-loop
			"no-unreachable-loop": "error",

			// disallow use of optional chaining in contexts where the undefined value is not allowed
			// overrides recommended rule defaults to disallow arithmetic operators
			// https://eslint.org/docs/latest/rules/no-unsafe-optional-chaining
			"no-unsafe-optional-chaining": ["error", { disallowArithmeticOperators: true }],

			// disallow unnecessary computed property keys in objects and classes
			// https://eslint.org/docs/latest/rules/no-useless-computed-key
			"no-useless-computed-key": "error",

			// disallow unnecessary concatenation of literals or template literals
			// https://eslint.org/docs/latest/rules/no-useless-concat
			"no-useless-concat": "error",

			// disallow renaming import, export, and destructured assignments to the same name
			// https://eslint.org/docs/latest/rules/no-useless-rename
			"no-useless-rename": [
				"error",
				{ ignoreDestructuring: false, ignoreImport: false, ignoreExport: false },
			],

			// disallow redundant return statements
			// https://eslint.org/docs/latest/rules/no-useless-return
			"no-useless-return": "error",

			// require let or const instead of var
			// https://eslint.org/docs/latest/rules/no-var
			"no-var": "error",

			// disallow void operators
			// https://eslint.org/docs/latest/rules/no-void
			"no-void": "error",

			// require or disallow method and property shorthand syntax for object literals
			// https://eslint.org/docs/latest/rules/object-shorthand
			"object-shorthand": [
				"error",
				"always",
				{ ignoreConstructors: false, avoidQuotes: true },
			],

			// this rule requires or disallows assignment operator shorthand where possible.
			// https://eslint.org/docs/latest/rules/operator-assignment
			"operator-assignment": "error",

			// require using arrow functions for callbacks
			// https://eslint.org/docs/latest/rules/prefer-arrow-callback
			"prefer-arrow-callback": [
				"error",
				{ allowNamedFunctions: false, allowUnboundThis: true },
			],

			// require const declarations for variables that are never reassigned after declared
			// https://eslint.org/docs/latest/rules/prefer-const
			"prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: true }],

			// require destructuring from arrays and/or objects
			// https://eslint.org/docs/latest/rules/prefer-destructuring
			"prefer-destructuring": [
				"error",
				{
					VariableDeclarator: { array: false, object: true },
					AssignmentExpression: { array: true, object: false },
				},
				{ enforceForRenamedProperties: false },
			],

			// disallow the use of Math.pow in favor of the ** operator
			// https://eslint.org/docs/latest/rules/prefer-exponentiation-operator
			"prefer-exponentiation-operator": "error",

			// disallow parseInt() and Number.parseInt() in favor of binary, octal, and hexadecimal literals
			// https://eslint.org/docs/latest/rules/prefer-numeric-literals
			"prefer-numeric-literals": "error",

			// disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead
			// https://eslint.org/docs/latest/rules/prefer-object-spread
			"prefer-object-spread": "error",

			// disallow use of the RegExp constructor in favor of regular expression literals
			// https://eslint.org/docs/latest/rules/prefer-regex-literals
			"prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],

			// require rest parameters instead of arguments
			// https://eslint.org/docs/latest/rules/prefer-rest-params
			"prefer-rest-params": "error",

			// require spread operators instead of .apply()
			// https://eslint.org/docs/latest/rules/prefer-spread
			"prefer-spread": "error",

			// require template literals instead of string concatenation
			// https://eslint.org/docs/latest/rules/prefer-template
			"prefer-template": "error",

			// enforce the consistent use of the radix argument when using parseInt()
			// https://eslint.org/docs/latest/rules/radix
			radix: "error",

			// enforce sorted import declarations within modules
			// https://eslint.org/docs/latest/rules/sort-imports
			"sort-imports": ["error", { ignoreCase: true, ignoreDeclarationSort: true }],

			// require symbol descriptions
			// https://eslint.org/docs/latest/rules/symbol-description
			"symbol-description": "error",

			// require or disallow "Yoda" conditions
			// https://eslint.org/docs/latest/rules/yoda
			yoda: "error",

			// enforce consistent usage of type exports
			// https://typescript-eslint.io/rules/consistent-type-exports
			"@typescript-eslint/consistent-type-exports": "error",

			// enforce consistent usage of type imports
			// https://typescript-eslint.io/rules/consistent-type-imports
			"@typescript-eslint/consistent-type-imports": "error",

			// disallow generic Array constructors
			// https://typescript-eslint.io/rules/no-array-constructor
			"@typescript-eslint/no-array-constructor": "error",

			// enforce the use of top-level import type qualifier when an import only has specifiers with inline type qualifiers
			// https://typescript-eslint.io/rules/no-import-type-side-effects
			"@typescript-eslint/no-import-type-side-effects": "error",

			// enforce default parameters to be last
			// https://typescript-eslint.io/rules/default-param-last
			"@typescript-eslint/default-param-last": "error",

			// require a consistent member declaration order
			// https://typescript-eslint.io/rules/member-ordering
			"@typescript-eslint/member-ordering": "error",

			// disallow empty functions
			// https://typescript-eslint.io/rules/no-empty-function
			"@typescript-eslint/no-empty-function": [
				"error",
				{
					allow: [
						"arrowFunctions",
						"functions",
						"methods",
						"private-constructors",
						"protected-constructors",
						"overrideMethods",
					],
				},
			],

			// disallow function declarations that contain unsafe references inside loop statements
			// https://typescript-eslint.io/rules/no-loop-func
			"@typescript-eslint/no-loop-func": "error",

			// disallow variable declarations from shadowing variables declared in the outer scope
			// https://typescript-eslint.io/rules/no-shadow
			"@typescript-eslint/no-shadow": "error",

			// disallow unused variables
			// override the ignoreRestSiblings default option to true
			// https://typescript-eslint.io/rules/no-unused-vars
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ vars: "all", args: "after-used", ignoreRestSiblings: true },
			],

			// disallow the use of variables before they are defined
			// https://typescript-eslint.io/rules/no-use-before-define
			"@typescript-eslint/no-use-before-define": [
				"error",
				{ functions: true, classes: true, variables: true },
			],

			// disallow unnecessary constructors
			// https://typescript-eslint.io/rules/no-useless-constructor
			"@typescript-eslint/no-useless-constructor": "error",

			// disallow throwing non-Error values as exceptions
			// https://typescript-eslint.io/rules/only-throw-error
			"@typescript-eslint/only-throw-error": "error",

			// require or disallow parameter properties in class constructors
			// https://typescript-eslint.io/rules/parameter-properties
			"@typescript-eslint/parameter-properties": "error",

			// If a default import is requested, this rule will report if there is no default export in the imported module
			// Disable rule from recommended
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/default.md
			"import/default": "off",

			// report on improper use of extensions when importing
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md
			"import/extensions": [
				"error",
				{
					mjs: "always",
					mts: "always",
					js: "never",
					jsx: "never",
					ts: "never",
					tsx: "never",
					cjs: "never",
					cts: "never",
				},
			],

			// this rule reports any imports that come after non-import statements
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md
			"import/first": "error",

			// Enforces names exist at the time they are dereferenced, when imported as a full namespace (i.e. import * as foo from './foo'; foo.bar(); will report if bar is not exported by ./foo.)
			// Disable rule from recommended
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md
			"import/namespace": "off",

			// enforces having one or more empty lines after the last top-level import statement or require call
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md
			"import/newline-after-import": "error",

			// this rule forbids the import of modules using absolute paths
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-absolute-path.md
			"import/no-absolute-path": "error",

			// reports require([array], ...) and define([array], ...) function calls at the module scope. Will not report if !=2 arguments, or first argument is not a literal array
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-amd.md
			"import/no-amd": "error",

			// reports if a resolved path is imported more than once
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-duplicates.md
			"import/no-duplicates": "error",

			// this rule forbids every call to require() that uses expressions for the module name argument
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md
			"import/no-dynamic-require": "error",

			// forbid the import of external modules that are not declared in the package.json's dependencies, devDependencies, optionalDependencies, peerDependencies, or bundledDependencies
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md
			"import/no-extraneous-dependencies": [
				"error",
				{
					devDependencies: [
						"**/__tests__/**", // jest pattern
						"**/__mocks__/**", // jest pattern
						"**/*.{test,spec}.{c,m,}[jt]s{x,}", // tests where the extension or filename suffix denotes that it is a test
						"**/{jest,eslint}.config.{c,m,}js", // jest or eslint config
					],
					optionalDependencies: false,
				},
			],

			// reports the use of import declarations with CommonJS exports in any module except for the main module
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-import-module-exports.md
			"import/no-import-module-exports": ["error", { exceptions: [] }],

			// forbids the use of mutable exports with var or let
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md
			"import/no-mutable-exports": "error",

			// reports use of an exported name as the locally imported name of a default export
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md
			"import/no-named-as-default": "error",

			// Reports use of an exported name as a property on the default export
			// Disable rule from recommended
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default-member.md
			"import/no-named-as-default-member": "off",

			// reports use of a default export as a locally named import
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-default.md
			"import/no-named-default": "error",

			// use this rule to prevent importing packages through relative paths
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-packages.md
			"import/no-relative-packages": "error",

			// forbid a module from importing itself
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-self-import.md
			"import/no-self-import": "error",

			// Ensures an imported module can be resolved to a module on the local filesystem, as defined by standard Node require.resolve behavior
			// Disable rule from recommended
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md
			"import/no-unresolved": "off",

			// tse this rule to prevent unnecessary path segments in import and require statements
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-useless-path-segments.md
			"import/no-useless-path-segments": ["error", { commonjs: true }],

			// enforce a convention in the order of require() / import statements
			// https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
			"import/order": [
				"error",
				{
					"newlines-between": "never",
					groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
					alphabetize: { order: "asc", caseInsensitive: true },
				},
			],
		},
	},
	{
		files: tsGlobs,
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		rules: {
			// disallow @ts-<directive> comments or require descriptions after directives
			// override recommended rule defaults to force specific description syntax for ts-expect-error
			// https://typescript-eslint.io/rules/ban-ts-comment
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": { descriptionFormat: "^: " },
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],

			// require explicit accessibility modifiers on class properties and methods
			// https://typescript-eslint.io/rules/explicit-member-accessibility
			"@typescript-eslint/explicit-member-accessibility": "error",

			// require explicit return and argument types on exported functions' and classes' public class methods
			// https://typescript-eslint.io/rules/explicit-module-boundary-types
			"@typescript-eslint/explicit-module-boundary-types": "error",

			// enforce naming conventions for everything across a codebase
			// https://typescript-eslint.io/rules/naming-convention
			"@typescript-eslint/naming-convention": [
				"error",
				// camelCase for everything not otherwise indicated
				{ selector: "default", format: ["camelCase"] },
				// allow any naming convention for imports
				{ selector: "import", format: null },
				// allow unused parameters and variables that are only underscores
				{
					selector: ["parameter", "variable"],
					filter: { regex: "^_+$", match: true },
					modifiers: ["unused"],
					format: null,
				},
				// do not enforce format on property names
				{ selector: "property", format: null },
				{
					selector: ["class", "enum", "interface", "typeAlias"],
					format: ["PascalCase"],
				},
				// Generic type parameters in format of:
				// - Starts with T
				// - Followed by a capital letter
				// - Followed by any number of lowercase or uppercase letters, but never more than one consecutive uppercase letter
				// - Ends with a lowercase letter or number
				{
					selector: "typeParameter",
					format: null,
					custom: {
						regex: "^T[A-Z](?:[a-z]+[A-Z])*[a-z\\d]+$",
						match: true,
					},
				},
				// allow variables to be camelCase or UPPER_CASE
				{ selector: "variable", format: ["camelCase", "UPPER_CASE"] },
			],

			// disallow non-null assertions using the ! postfix operator
			// https://typescript-eslint.io/rules/no-non-null-assertion
			"@typescript-eslint/no-non-null-assertion": "error",

			// enforce using the nullish coalescing operator instead of logical assignments or chaining
			// override @typescript-eslint/stylistic-type-checked to ignore booleans in nullish coalescing checks
			// https://typescript-eslint.io/rules/prefer-nullish-coalescing
			"@typescript-eslint/prefer-nullish-coalescing": [
				"error",
				{ ignorePrimitives: { boolean: true } },
			],

			// require private members to be marked as readonly if they're never modified outside of the constructor
			// https://typescript-eslint.io/rules/prefer-readonly
			"@typescript-eslint/prefer-readonly": "error",

			// disallow certain types in boolean expressions
			// https://typescript-eslint.io/rules/strict-boolean-expressions
			"@typescript-eslint/strict-boolean-expressions": [
				"error",
				{ allowNullableBoolean: true },
			],
		},
	},
	eslintConfigPrettier,
);
