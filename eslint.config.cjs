// eslint.config.cjs

const next = require('eslint-config-next');

module.exports = [
  ...next(),
  {
    ignores: ['node_modules', 'dist', '.next'],
  },
];