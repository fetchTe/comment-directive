/* eslint-disable @stylistic/max-len */
type NonEmptyString = string & { length: number };

/**
 * command-line arguments (pure/iffe wrapped so we can shake the tree)
 * @see {@link https://nodejs.org/api/process.html#processargv|Node.js process.argv docs}
 */
export const ARGV: string[] = /* @__PURE__ */ (() =>
  typeof process === 'undefined'
    /** quickJs {@link https://bellard.org/quickjs/quickjs.html#Global-objects} */
    ? typeof scriptArgs !== 'undefined'
      ? scriptArgs
      : []
    : ((globalThis as never)?.['Deno']
      // if --allow-all is used, no args (like --allow-env), use default
      // @ts-expect-error deno uses 'args' rather than 'argv'
      ? (process['args']?.length ? process['args'] : process['argv'])
      : process['argv']
    ) ?? []
)();


/**
 * gets any* reasonable argv option value by key (returns null for flags, must have value)
 * @example --key=value --key="value" --key="val ue" --key "val ue" (-- | - | "" | '')
 * @note   un-reasonable values: non-escaped multi-lines; malformed keys; mismatching quotes
 * @param  {string} key           - argv key/id (--key, -key)
 * @param  {string[]} [argv=ARGV] - command-line argv
 * @return {null | string}
 */
export const getArgvOption = (keys: string | string[], argv = ARGV) => !argv?.length
  ? null
  : ([keys].flat().filter(Boolean).map(key =>
    argv.map(v => ((/\s/).test(v) && !(/=['"]/).test(v) ? v.replace(/^(([\w-]+=)?)(.*)$/, '$1"$3"') : v)).join(' ').match(
      new RegExp(`(^|[\\s])(?:--|-)${key}(?:=|\\s+)(['"]?)([^-\\s][^'"-\\s]*?|(?:\\D?[^-].*?))\\2(?:\\s|$)`, 'i'),
    )?.[3]).filter(v => v !== undefined)[0])?.replace(/^(['"])(.*)\1$/, '$2') // remove matching quotes
    .replace(/^(['"])(.*)(['"])$/, (m, q1, body, q2) => q1 === q2 ? body : m)
  ?? null;


/**
 * checks for presence of key (flags) in argv
 * @example --example -flag
 * @param  {string | string[]} keys - argv key/id (--key, -key)
 * @param  {string[]} [argv=ARGV]   - command-line argv
 * @return {boolean}
 */
export const hasArgvFlags = (keys: string | string[], argv = ARGV): boolean => !argv?.length
  ? false
  : !!([keys].flat().filter(Boolean).find(key =>
    (new RegExp(`(^|[^\\S])(?:--|-)${key}(=|\\s|$)`, 'i')).test(argv.join(' '))));


/**
 * argv helper that checks for both flag (true) and option cli arguments (NonEmptyString)
 * @example -flag --flag --key=value --key="value" --key="val ue" --key "val ue" (-- | - | "" | '')
 * @param  {string} key           - argv key/id (--key, -key)
 * @param  {string[]} [argv=ARGV] - command-line argv
 * @return {null | true | NonEmptyString}
 */
export const getArgv = (key: string, argv = ARGV): null | NonEmptyString | true => !argv?.length
  ? null
  : hasArgvFlags(key, argv)
    ? (getArgvOption(key, argv) ?? true)
    : null;


/**
 * gets all* reasonable argv options and returning a [key, value] tuple
 * @note does not handle positional: '--opt val --flag positional' -> [[opt, val], [flag, posiitonal]]
 * @param  {string[]} [argv=ARGV] - command-line argv
 * @return {[key: string, value: string][]}
 */
export const getArgvOptionTuple = (
  argv: string[] = ARGV,
): [key: string, value: string][] => {
  if (!argv?.length) { return []; }
  const results: [string, string][] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    // must start with one or two dashes but cannot be just "-"
    if (token === undefined || token === '-' || !(/^--?/).test(token)) { continue; }
    // the option terminator
    if (token === '--') { break; }
    const [tkey, ...parts] = token.split('=');
    const key = tkey?.replace(/^--?/, '');
    if (!key) { continue; }
    // using getArgvOption allows for a more unified/expected result
    const pair = getArgvOption(key, argv.slice(i));
    if (pair) {
      results.push([key, pair]);
      const next = argv[i + 1];
      // if no "=" then --key value  |  -k value (negative lookahead for negative number)
      !parts.length && (next !== undefined && (!(/^-/).test(next) || !Number.isNaN(Number(next))))
        && i++; // consume the value so it is not re-evaluated
    }
  }
  return results;
};


/**
 * extracts positional CLI arguments with option to ignore known flags
 * @example
 * - getArgvPositional(argv) - treats all non-flag arguments as positionals
 * - getArgvPositional(flags, argv) - filters out known flags before extracting positionals
 * @param {...[string[], string[]?] | [string[]?]} args - flags + argv, or just argv
 * @returns {string[] | null} - positional args or null if none
 */
export const getArgvPositional = (
  ...args: [flags: string[], argv?: string[]] | [argv?: string[]]
): string[] | null => {
  // parse/config args either: () | (flags) | (flags, argv)
  const [arg1, arg2] = args;
  const isFlagForm = Array.isArray(arg1) && Array.isArray(arg2);
  const isArgvOnly = Array.isArray(arg1) && !arg2;
  const flags = isFlagForm ? arg1! : [];
  const argv = isFlagForm ? arg2! : isArgvOnly ? arg1! : typeof ARGV !== 'undefined' ? ARGV : [];
  if (!argv.length) {return null;}

  // filter out flags and slice node+path
  const sflag = new Set(flags.flatMap(f => (f[0] === '-' ? [f] : [`-${f}`, `--${f}`])));
  const slicedArgv = argv.slice(
    (argv[0] && (/node|bun|deno|qjs/i).test(argv[0]) && argv.length >= 2) ? 2 : 1,
  ).filter(val => !sflag.has(val));

  const result = [];
  for (let i = 0; i < slicedArgv.length; i++) {
    const arg = slicedArgv[i];
    if (arg === undefined) { continue; }
    // the option terminator is here and terminating all into positionals
    if (arg === '--') { result.push(...slicedArgv.slice(i + 1)); break; }
    const hyp1 = arg[0] === '-';
    // positional
    if (arg === '-' || !hyp1) { result.push(arg); continue; }
    const nxt = slicedArgv[i + 1];
    const nxt1 = nxt?.[1] === '-';
    // double -- flag
    if (arg[1] === '-') { if (!arg.includes('=') && nxt && !nxt1) {i++;} continue; }
    // negative number
    if (hyp1 && !Number.isNaN(Number.parseFloat(arg))) { result.push(arg); continue; }
    if (nxt && !nxt1) {i++;}
  }
  return result.length ? result : null;
};


/**
 * check if string contains truthy/falsey value
 *  - true : true|1|yes|on
 *  - false: false|0|no|off
 * @param  {unknown} val - input
 */
export const getBooly = <V>(val: V) => (typeof val !== 'string'
  ? val
  : (/^(true|1|yes|on)$/i).test(val.trim())
    ? true
    : ((/^(false|0|no|off)$/i).test(val.trim()) ? false : val));


type AnsiPairs = {
  red: 31, // null
  green: 32, // strings
  yellow: 33,
  blue: 34, // keys
  magenta: 35, // booleans
  cyan: 36, // numbers
  white: 37,
};
type Ansi = AnsiPairs[keyof AnsiPairs];
export const paint = (txt: string, ansi: Ansi = 34, font: null | 1 | 2 = null, esc = '\x1b[') =>
  (esc + (font ? `${font};` : '') + `${ansi}m${txt}${esc}0m`);

export const prettyPrintJson = <T>(json: T, superPretty = true, indent = 2): string => {
  const colorize = (s: string) => s.replace(
    /("(\\.|[^"\\])*?"(?=\s*:))|("(\\.|[^"\\])*?")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m, key) => paint(
      superPretty && key ? m.slice(1, -1) : m,
      key ? 34 : m === 'null' ? 31 : m === 'true' || m === 'false' ? 35 : m.match(/^".*"$/) ? 32 : 36,
    ),
  );
  const sjson = (typeof json === 'string' ? json : JSON.stringify(json, null, indent));
  return !superPretty
    ? colorize(sjson)
    : colorize(sjson.replace(/^\s*\{\n?|\n?\s*\}$/g, '')
      .replace(/\[\s*\n((?:[^[\]]*\n)*?)\s*\]/g,
        (_, c) => `[${c.trim().replace(/\s*\n\s*/g, ' ')}]`));
};
