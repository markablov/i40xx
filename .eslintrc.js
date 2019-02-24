module.exports = {
  "parser": "babel-eslint",
  "globals": {
    "process": true
  },
  "env": {
    "es6": true,
    "browser": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "babel/semi": 1,
    "no-unused-vars": [
      "error",
      {"ignoreRestSiblings": true}
    ],
    "indent": [
      "error",
      2,
      { "SwitchCase": 1 }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single",
      { "allowTemplateLiterals": true }
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-console": "warn",
    "react/prop-types": 0,
    "keyword-spacing": [
      "error",
      { "after": true }
    ],
    "object-curly-spacing": [
      "error",
      "always",
    ],
  },
  "plugins": [
    "react",
    "babel"
  ],
  "settings": {
    "react": {
      "version": "16.8"
    },
  },
};
