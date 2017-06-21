module.exports = {
    root: true,
    "env": {
        "node": true,
        "commonjs": true,
        "es6": true,
        "jquery": false,
        "jest": true,
        "jasmine": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "plugins": [
        "promise"
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
        ]
    }
};