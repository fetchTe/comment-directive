/**                                                                       @about
@docs: https://eslint.org
@desc: eslint v9 config with reasonable base, typescript, and stylistic defaults
@note: there are a few of worthwhile ESLint plugins, but any good baker knows that
       just like overmixing, overlinting can lead to tough, dense, and dry buns
***                                                                           */
import esLint from '@eslint/js';
import pluginStylistic from '@stylistic/eslint-plugin';
import tsLint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync  } from 'node:fs';
import { parseConfigFileTextToJson } from 'typescript';


// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------
// poly for 'import.meta.dirname' since Node v20 is still new-ish-er
const DIRNAME = dirname(fileURLToPath(import.meta.url))

// @docs: https://typescript-eslint.io/getting-started/typed-linting
// @note: meh, in my experience it's just a hassle that is often wrong
const CHECK_TYPE = false;
// @docs: https://typescript-eslint.io/users/configs#strict
// @idea: a make env flag?
const CHECK_STRICT = false;

const PATH_TSC = join(DIRNAME, 'tsconfig.json');
// use tsconfig to create file globs but you can add/modify
const TSC = parseConfigFileTextToJson(PATH_TSC, readFileSync(PATH_TSC).toString())
const GLOB_IGNORE = (TSC.config.exclude || []).concat([
  '**/tmp'
]);
const GLOB_TS = (TSC.config.include || []).concat([
  // 'other/**/*.ts'
]);


// -----------------------------------------------------------------------------
// Configure Language Options
// @docs: https://eslint.org/docs/latest/use/configure/language-options#
// -----------------------------------------------------------------------------
const LANGUAGE_OPTIONS = {
  ecmaVersion: 2023,
  sourceType: 'module',
};


// -----------------------------------------------------------------------------
// "recommended" configs (not all plugins export a recommended)
// @docs: https://eslint.org/docs/latest/extend/plugins#configs-in-plugins
// -----------------------------------------------------------------------------
const RECOMMENDED_CONFIGS = [
  esLint.configs.recommended,
  ...tsLint.configs[CHECK_TYPE ? 'stylisticTypeChecked' : 'stylistic'],
  ...tsLint.configs[CHECK_TYPE
    ? (CHECK_STRICT ? 'strictTypeChecked' : 'recommendedTypeChecked')
    : (CHECK_STRICT ? 'strict' : 'recommended')],
];



// -----------------------------------------------------------------------------
// main confing
// -----------------------------------------------------------------------------
const TYPESCRIPT_CONFIG = {
  files: GLOB_TS,

  plugins: {
    'import/parsers': tsParser,
    '@stylistic': pluginStylistic,
  },

  // @docs: https://eslint.org/docs/v9.x/use/configure/configuration-files#configuring-linter-options
  linterOptions: {
    reportUnusedDisableDirectives: false,
  },

  languageOptions: {
    ...LANGUAGE_OPTIONS,
    parser: tsParser,
    parserOptions: {
      project: TSC,
      // indicates to ask TypeScript's type checking service for source file's type
      // @docs: typescript-eslint.io/packages/parser#projectService
      projectService: CHECK_TYPE ? true : undefined,
      tsconfigRootDir: DIRNAME,
    },
  },

  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  rules: {
    // -------------------------------------------------------------------------
    // default
    // @docs: eslint.org/docs/latest/rules
    // -------------------------------------------------------------------------
    'no-duplicate-imports': 'off',
    'no-unneeded-ternary': 'warn',
    'linebreak-style': ['warn', 'unix'],


    // -------------------------------------------------------------------------
    // typescript-eslint
    // @docs: typescript-eslint.io
    // -------------------------------------------------------------------------
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      args: 'none',
    }],

    // perfer types since they are stricter than interfaces
    //  - can't accidentally redeclare and merge types
    //  - pass an object with more properties than the type defines
    '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    '@typescript-eslint/no-unused-expressions': ['error', {
      allowShortCircuit: true,
    }],

    'curly': ['warn', 'all'],
    '@stylistic/object-curly-newline': ['warn', {
      ObjectExpression: { consistent: true, multiline: true, minProperties: 6 },
      ObjectPattern: { consistent: true, multiline: true, minProperties: 6 },
      ImportDeclaration: { consistent: true },
      ExportDeclaration: 'always',
    }],


    // -------------------------------------------------------------------------
    // stylistic
    // @docs: https://eslint.style/rules
    // -------------------------------------------------------------------------
    '@stylistic/array-bracket-newline': ['warn', { multiline: true }],
    '@stylistic/array-bracket-spacing': ['warn', 'never', { arraysInArrays: true, singleValue: false }],
    '@stylistic/array-element-newline': ['warn', { consistent: true, multiline: true, minItems: null }],
    '@stylistic/arrow-parens': ['warn', 'as-needed'],
    '@stylistic/arrow-spacing': ['warn', { before: true, after: true  }],
    '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
    '@stylistic/comma-dangle': ['warn', 'always-multiline'],
    '@stylistic/comma-spacing': ['warn', { before: false, after: true }],
    '@stylistic/comma-style': ['warn', 'last'],
    '@stylistic/computed-property-spacing': ['error', 'never', { enforceForClassMembers: true }],
    '@stylistic/function-paren-newline': ['warn', 'consistent'],
    '@stylistic/keyword-spacing': ['warn', { before: true }],
    '@stylistic/linebreak-style': ['error', 'unix'],
    '@stylistic/max-len': ['warn', { tabWidth: 2, ignoreComments: true, code: 100 }],
    '@stylistic/max-statements-per-line': ['off'],
    '@stylistic/multiline-ternary': ['warn', 'always-multiline'],
    '@stylistic/no-confusing-arrow': ['warn', { allowParens: true, onlyOneSimpleParam: true }],
    '@stylistic/no-extra-parens': ['error', 'functions'],
    '@stylistic/no-floating-decimal': ['error'],
    '@stylistic/no-mixed-operators': ['error'],
    '@stylistic/no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
    '@stylistic/no-multi-spaces': ['warn', {exceptions: {VariableDeclarator: true, ImportDeclaration: true}}],
    '@stylistic/no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 2, maxBOF: 2 }],
    '@stylistic/no-tabs': ['error'],
    '@stylistic/no-trailing-spaces': ['warn', { ignoreComments: true }],
    '@stylistic/no-whitespace-before-property': ['error'],
    '@stylistic/nonblock-statement-body-position': ['error', 'below'],
    '@stylistic/object-property-newline': ['warn', {allowAllPropertiesOnSameLine: true}],
    '@stylistic/one-var-declaration-per-line': ['error', 'initializations'],
    '@stylistic/operator-linebreak': ['warn', 'before'],
    '@stylistic/rest-spread-spacing': ['error', 'never'],
    '@stylistic/space-before-blocks': ['warn', 'always'],
    '@stylistic/space-before-function-paren': ['warn', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    '@stylistic/space-infix-ops': ['warn', { int32Hint: false }],
    '@stylistic/space-unary-ops': ['error', {words: true, nonwords: false}],
    '@stylistic/spaced-comment': ['warn', 'always', { exceptions: ['*', '-'] }],
    '@stylistic/switch-colon-spacing': ['warn', {after: true, before: false}],
    '@stylistic/template-curly-spacing': ['warn', 'never'],
    '@stylistic/type-annotation-spacing': ['warn', { before: false, after: true }],
    '@stylistic/type-generic-spacing': ['warn'],
    '@stylistic/type-named-tuple-spacing': ['warn'],
    '@stylistic/wrap-iife': ['error', 'any'],
    '@stylistic/wrap-regex': 'warn',
    '@stylistic/yield-star-spacing': ['warn', {before: false, after: true}],
    // https://eslint.style/rules/default/padding-line-between-statements
    '@stylistic/padding-line-between-statements': [
      'warn',
      { blankLine: 'never', prev: 'function-overload', next: 'function'},
      {blankLine: 'always', prev: '*', next: ['enum', 'interface'] }
    ],

    // -------------------------------------------------------------------------
    // stylistic (eslint default overrides)
    // -------------------------------------------------------------------------
    'semi': 'off',
    '@stylistic/no-extra-semi': ['error'],
    '@stylistic/semi': ['warn', 'always'],
    '@stylistic/semi-spacing': ['warn', { after: true, before: false }],
    '@stylistic/semi-style': ['warn', 'last'],

    'indent': 'off',
    '@stylistic/indent': ['warn', 2, {
      VariableDeclarator: 'first',
      ArrayExpression: 1,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      MemberExpression: 1,
      outerIIFEBody: 'off'
    }],

    'quotes': 'off',
    '@stylistic/quotes': ['warn', 'single', { "avoidEscape": true, allowTemplateLiterals: "avoidEscape" }],
    '@stylistic/quote-props': ['warn', 'consistent-as-needed'],
  },
};


// -----------------------------------------------------------------------------
// overrides
// -----------------------------------------------------------------------------
const OVERRIDE_CONFIG = [
  CHECK_TYPE ? {files: ['**/*.js'], extends: [tsLint.configs.disableTypeChecked]} : null
].filter(Boolean);


// -----------------------------------------------------------------------------
// eslint build config
// -----------------------------------------------------------------------------
const ESLINT_CONFIG = [
  { ignores: GLOB_IGNORE },
  ...RECOMMENDED_CONFIGS,
  TYPESCRIPT_CONFIG,
  ...OVERRIDE_CONFIG,
];

// eslint-disable-next-line no-undef
process.env.ESLINT_DEBUG && console.log(ESLINT_CONFIG);

export default ESLINT_CONFIG;
