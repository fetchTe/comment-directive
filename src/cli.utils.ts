/* eslint-disable @stylistic/max-len */


/**
 * Object.entries with more precise type inference
 * @template T - type of the object
 * @param {T} obj - object whose entries are to be extracted
 * @returns {({ [K in keyof T]: [K, T[K]] }[keyof T])[]} - array of the object's entries (key-value pairs)
 */
export const toEntries = Object.entries as <
  T extends Record<PropertyKey, unknown>,
>(obj: T)=> ({
  [K in keyof T]: [K, T[K]]
}[keyof T])[] & { 0: { [K in keyof T]: [K, T[K]] }[keyof T] };

/**
 * Object.keys with more precise type inference
 * @template T - type of the object
 * @param {T} obj - object whose keys are to be extracted
 * @returns {(keyof T)[]} - array of the object's keys
 */
export const toKeys = Object.keys as <
  T extends Record<PropertyKey, unknown>,
>(obj: T)=> (keyof T)[] & { 0: keyof T };


/**
 * casts a value to boolean or null using common truthy or falsey string equivalents
 * @param  {unknown}       val        - value to cast
 * @param  {boolean|null}  def=null   - default value when input cannot be interpreted
 * @return {boolean|null}
 */
export const castBooly = (val: unknown, def = null): boolean | null =>
  (/^(true|1|yes|on)$/i).test(String(val))
    ? true
    : ((/^(false|0|no|off)$/i).test(String(val)) ? false : def);


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


/**
 * wraps text with ansi escape codes for optional font style and color
 * @param  {string}           txt         - text to colorize
 * @param  {Ansi}             ansi=34     - ansi color code
 * @param  {(1|2|null)}       font=null   - optional font style code
 * @param  {string}           esc='\x1b[' - escape prefix
 * @return {string}
 */
export const paint = (txt: string, ansi: Ansi = 34, font: null | 1 | 2 = null, esc = '\x1b[') =>
  (esc + (font ? `${font};` : '') + `${ansi}m${txt}${esc}0m`);


/**
 * pretty prints json with optional colorization using ansi codes
 * @template T
 * @param  {T}        json                - json value or pre-stringified json
 * @param  {boolean}  superPretty=true    - enable compact braces and inline arrays
 * @param  {number}   indent=2            - indentation width for JSON.stringify
 * @return {string}
 */
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

