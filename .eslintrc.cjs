module.exports = {
  extends: [
    // add more generic rule sets here, such as:
    // 'eslint:recommended',
    'plugin:svelte/recommended'
  ],
  parser: '@typescript-eslint/parser',
  ignorePatterns: ["dist", "**/vendor/*.js"],
  rules: {
    // override/add rules settings here, such as:
    // 'svelte/rule-name': 'error'
  }
};