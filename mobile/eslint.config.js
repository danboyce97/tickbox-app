const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ['dist/*', 'rootStore.example.ts', 'nativewind-env.d.ts', 'node_modules/*'],
  },
  ...compat.extends('expo'),
  {
    rules: {
      'import/first': 'off',
    },
  },
];
