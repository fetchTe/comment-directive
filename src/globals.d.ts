// global(s) set via: bun --define
declare global {
  const ENV: 'DEV' | 'PROD' | 'TEST';
  const IS_DEBUG: 0 | 1;
  const IS_DEV: 0 | 1;
  const IS_FORMAT: 'cjs' | 'esm';
  const IS_PROD: 0 | 1;
  const IS_TEST: 0 | 1;
  const IS_WATCH: 0 | 1;
}

export {};
