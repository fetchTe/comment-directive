// global(s) set via: bun --define
declare global {
  const ENV: 'DEV' | 'PROD' | 'TEST';
  const IS_DEBUG: 0 | 1;
  const IS_DEV: 0 | 1;
  const IS_FORMAT: 'cjs' | 'esm';
  const IS_PROD: 0 | 1;
  const IS_TEST: 0 | 1;
  const IS_WATCH: 0 | 1;

  // ---------------------------------------------------------------------------
  // globalThis variables -> must use var; wont work with let or const
  // ---------------------------------------------------------------------------
  // QuickJS - Provides the command line arguments. The first argument is the script name.
  // @see {@link https://quickjs-ng.github.io/quickjs/stdlib#scriptargs}
  // @see {@link https://bellard.org/quickjs/quickjs.html#Global-objects}
  var scriptArgs: string[] | undefined;
}

export {};
