module.exports = {
  extends: 'erb',
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',
    // Since React 17 and typescript 4.1 you can safely disable the rule
    'react/react-in-jsx-scope': 'off',
    'guard-for-in': 'off',
    'no-restricted-syntax': [
      'error',
      // 'ForInStatement',
      // 'ForOfStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'max-classes-per-file': 'off',
    'import/prefer-default-export': 'off',
    'no-alert': 'off',
    'react/no-array-index-key': 'off',
    'promise/always-return': 'off',
    'promise/catch-or-return': 'off',
    'react/destructuring-assignment': 'off',
    'no-nested-ternary': 'off',
    'promise/no-nesting': 'off',
    'react/jsx-props-no-spreading': 'off',
    'import/no-cycle': 'off',
    '@typescript-eslint/no-loop-func': 'off',
    'jsx-a11y/control-has-associated-label': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'no-await-in-loop': 'off',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
