module.exports = {
    "extends": [
        "eslint:recommended",
    ],
    "env": {
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "no-unused-vars": 0,
        "indent": [2, 2],
    }
};