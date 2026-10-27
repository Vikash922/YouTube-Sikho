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
    '@typescript-eslint/no-var-requires': 'off',
    'no-empty': 'warn',
    'prefer-const': 'warn',
    'no-console': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'admin/',
    'functions/',
    'scripts/',
    '*.js',
  ],
};
