module.exports = {
    "env": {
        "node": true,
        "commonjs": true,
        "es6": true,
        "jquery": false,
        "jest": true,
        "jasmine": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:security/recommended"
    ],
    "parserOptions": {
        "sourceType": "module"
    },
    "plugins": [
        "node",
        "promise",
        "security"
    ],
    "rules": {
        "indent": [
            "warn",
            "tab",
            { SwitchCase: 1 }
        ],
        "quotes": [
            "warn",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-var": [
            "error"
        ],
        "no-console": [
            "error"
        ],
        "no-unused-vars": [
            "warn"
        ],
        "no-trailing-spaces": [
            "error"
        ],
		"linebreak-style": [
			"error",
			"unix"
		],
		"no-alert": 0,
		"no-shadow": 0,
		"security/detect-object-injection": ["off"],
        "no-process-exit": ["off"],
        "node/no-unpublished-require": 0
    }
};
