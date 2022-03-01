module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: 'airbnb',
  globals: {
    process: true,
  },
  overrides: [],
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      plugins: ['@babel/plugin-syntax-class-properties', '@babel/plugin-proposal-private-methods'],
      presets: ['@babel/preset-react'],
    },
    requireConfigFile: false,
  },
  plugins: [
    'react-hooks',
    'react',
    'sort-destructure-keys',
    'sort-keys-fix',
  ],
  rules: {
    'brace-style': [
      'error',
      '1tbs',
      {
        allowSingleLine: false,
      },
    ],
    curly: ['error', 'all'],
    'implicit-arrow-linebreak': 'off',
    'import/extensions': 'off',
    'max-len': [
      'error',
      120,
      2,
      {
        ignoreComments: false,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true,
      },
    ],
    'no-await-in-loop': 'off',
    'no-bitwise': 'off',
    'no-console': 'error',
    'no-continue': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': [
      'error',
      {
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        selector: 'ForInStatement',
      },
      {
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        selector: 'LabeledStatement',
      },
      {
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        selector: 'WithStatement',
      },
    ],
    'no-throw-literal': 'off',
    'object-curly-newline': [
      'error',
      {
        consistent: true,
        multiline: true,
      },
    ],
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: true,
      },
    ],
    radix: 'off',
    'react/jsx-filename-extension': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-sort-default-props': 'error',
    'react/jsx-sort-props': ['error', {
      reservedFirst: true,
      shorthandFirst: true,
    }],
    'react/jsx-uses-vars': 1,
    'react/no-array-index-key': 'off',
    'react/sort-prop-types': ['error', {
      sortShapeProp: true,
    }],
    'react/state-in-constructor': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'sort-destructure-keys/sort-destructure-keys': ['error', {
      caseSensitive: false,
    }],
    'sort-keys-fix/sort-keys-fix': ['error', 'asc', {
      caseSensitive: false,
      natural: true,
    }],
  },
};
