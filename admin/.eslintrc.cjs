module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-empty': 'warn',
    'prefer-const': 'warn',
    'no-console': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
  ],
};
