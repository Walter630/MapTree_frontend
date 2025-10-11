/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue']
  },
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    /* 🔹 Regras gerais de boas práticas */
    'no-unused-vars': 'off', // substituído pelo do TS
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    /* 🔹 Estilo */
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false,
        trailingComma: 'none',
        endOfLine: 'auto',
        printWidth: 100
      }
    ],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'arrow-parens': ['error', 'always'],
    'space-before-function-paren': ['error', 'never'],

    /* 🔹 Vue */
    'vue/multi-word-component-names': 'off', // permite componentes com nome único
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'always',
          normal: 'never',
          component: 'always'
        },
        svg: 'always',
        math: 'always'
      }
    ],
    'vue/max-attributes-per-line': [
      'error',
      {
        singleline: 4,
        multiline: 1
      }
    ],
    'vue/html-indent': ['error', 2, { baseIndent: 1 }],
    'vue/singleline-html-element-content-newline': 'off',

    /* 🔹 TypeScript */
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'public',
    '*.config.*',
    'vite.config.*',
    'env.d.ts'
  ]
}
