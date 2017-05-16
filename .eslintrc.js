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
            "tab"
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
            "off"
        ],
        "no-unused-vars": [
            "warn"
        ]
    }
};