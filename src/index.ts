// -----------------------------------------------------------------------------
// @id::constants
// -----------------------------------------------------------------------------

// maps short action codes to their full names
const ACT_MAP = {
  fn: 'fn',
  no: 'op',
  rml: 'rm_line',
  rmc: 'rm_comment',
  unc: 'un_comment',
  sed: 'sed',
  append: 'append',
  prepend: 'prepend',
  unshift: 'unshift',
  push: 'push',
  shift: 'shift',
  pop: 'pop',
} as const;

// list of valid action prefixes for parsing
// eslint-disable-next-line @stylistic/max-len
const ACT_PREFIXS = ['no=', 'rm=', 'un=', 'sed=', 'fn=', 'append=', 'prepend=', 'unshift=', 'push=', 'shift=', 'pop='] as const;

// sequence-based actions
const ACT_SEQ_ARR = ['append', 'prepend', 'unshift', 'push', 'shift', 'pop'] as const;

// default c-like comment format (js/rust/c)
export const DEFAULT_OPTIONS: CommentOptionsR = {
  // id/match options
  delimiter: '/',        // sed and sequence actions delimiter (default: '/')
  identifier: '###[IF]', // comment directive identifier (default: '###[IF]')
  // parse options
  escape: true,          // escape regex patterns to match literal strings (default: true)
  loose: false,          // allow directives on lines with other content (default: false)
  nested: false,         // allow nested multi-line comments (default: false)
  disableCache: false,   // if memory is a concern in absurd/extreme use cases (default: false)
  throw: false,          // throw on any error instead of logging and ignoring (default: false)
  // keep/preserve options
  keepDirective: false,  // keep comment directive in output (default: false)
  keepEmpty: false,      // keep/preserve removed empty comments/lines (default: false)
  // keepPad* ->  false=none; true=both; 1=single only; 2=multi only
  keepPadStart: true,    // start/leading whitespace for un/rm-comment (default: true)
  keepPadIn: 2,          // inside whitespace for un/rm-comment (default: 2)
  keepPadEnd: 2,         // end whitespace for un/rm-comment (default: 2)
  keepPadEmpty: false,   // empty-line whitespace-only for un/rm-comment (default: false) 
  // regex comment/language support options
  multi: [/\s*\/\*/, /\*\/\s*/],
  single: [/\s*\/\/\s*/, null], // eating the starting/surrounding space simplifies alignment
  fn: (input, _id, _idx) => input, // 'fn' comment directive consumer
};

const LOOSE_PLACEHOLE = '_CMT_l00S3_';

// -----------------------------------------------------------------------------
// @id::types
// -----------------------------------------------------------------------------

export type CommentOptions = {
  /* change sed delimiter (default: '/') */
  delimiter?: string;
  /* the acutal comment directive identifier (default: '###[IF]') */
  identifier?: string;
  /* allows directives on lines with other content (default: false) */
  loose?: boolean;
  /* if multi-line comments can be nested (default: false) */
  nested?: boolean;
  /* if memory is a concern while processing huge/many different directives (default: false) */
  disableCache?: boolean;
  /* throw on any error instead of logging and ignoring (default: false) */
  throw?: boolean;
  /* escape regex patterns to match literal strings (default: true) */
  escape?: boolean;
  /* keep directive comments in the output (default: false) */
  keepDirective?: boolean;
  /* preserve empty removed comment/lines/directive lines (default: false) */
  keepEmpty?: boolean;
  /* start/leading whitespace control for un/rm-comment (default: true) */
  keepPadStart?: boolean | 1 | 2,
  /* inside whitespace control for un/rm-comment (default: 2) */
  keepPadIn?: boolean | 1 | 2,
  /* end whitespace control for un/rm-comment (default: 2) */
  keepPadEnd?: boolean | 1 | 2,
  /* empty-line whitespace-only control for un/rm-comment (default: false) */
  keepPadEmpty?: boolean | 1 | 2,
  /* multi-line comment/language support (default: c-like) */
  multi?: [start: RegExp | string, end: RegExp | string] | [start: null, end: null];
  /* single-line comment/language support (default: c-like) */
  single?: [start: RegExp | string, end?: null | RegExp | string];
  /* 'fn' comment directive consumer (default: I => I) */
  fn?: (input: (string | number)[], id: string, idx: number) => (string | number)[];
};

// CommentOptions [R]equired
type CommentOptionsR = {
  [K in keyof CommentOptions]-?: CommentOptions[K];
};

// flags to control directive logic like: { prod: true, ver: 1, ok: 'cap' }
export type FlagStruc = Record<string, boolean | number | string>;

export type ActMap = typeof ACT_MAP;

export type ActsSeq = typeof ACT_SEQ_ARR[number];

export type ActionRemoveComment = { type: ActMap['rmc']; count: number; };

export type ActionUnComment = { type: ActMap['unc']; count: number; };

export type ActionRemoveLines = {
  type: ActMap['rml'];
  count: number;
  stop: null | string;
  val: string;
};

export type ActionNoop = {
  type: ActMap['no'];
  // @note -> count/stop don't do anything as of now, currently cogitating
  count: number;
  stop: null | string;
  val: string;
};

export type ActionFunction = {
  type: ActMap['fn'];
  count: number;
  stop: null | string;
  val: string;
};

export type ActionSedReplace = {
  type: ActMap['sed'];
  pattern: string;
  replacement: string;
  flags: string[];
  count: number;
  stop: null | string;
};

// add start
export type ActionPrepend = {
  type: ActMap['prepend'] | ActMap['unshift'];
  val: string;
  count: number;
  stop: null | string;
};

// remove start
export type ActionShift = {
  type: ActMap['shift'];
  val: string;
  count: number;
  stop: null | string;
};

// add end
export type ActionAppend = {
  type: ActMap['append'] | ActMap['push'];
  val: string;
  count: number;
  stop: null | string;
};

// remove end
export type ActionPop = {
  type: ActMap['pop'];
  val: string;
  count: number;
  stop: null | string;
};

export type ActionSequence = ActionAppend | ActionPrepend | ActionShift | ActionPrepend | ActionPop;

export type Actions = ActionNoop | ActionRemoveLines | ActionRemoveComment | ActionUnComment
| ActionSedReplace | ActionSequence | ActionFunction;


// parsed comment directive
export type Directive<A = Actions> = {
  key: string;
  value: string | number | boolean;
  ifTrue: A | null;
  ifFalse: A | null;
};


// compiled regex patterns for directive matching
type ReDirective = {
  dir: RegExp;
  scar: RegExp;
  scdr: RegExp | null;
  mcar: RegExp | null;
  mcdr: RegExp | null;
};


// -----------------------------------------------------------------------------
// @id::helpers
// -----------------------------------------------------------------------------

/**
 * type gaurd for number
 * @param  {unknown} value
 * @return {boolean} - value is number
 */
const isNumber = <T extends number = number>(value: unknown): value is T =>
  typeof value === 'number';


/**
 * type gaurd for string
 * @param  {unknown} value
 * @return {boolean} - value is string
 */
const isString = <T extends string = string>(value: unknown): value is T =>
  typeof value === 'string';


/**
 * action get from directive
 * @param  {type} dir         - directive
 * @param  {FlagStruc} flags  - flags
 * @return {A | null}
 */
const getAction = <A extends Actions>(dir?: Directive<A> | null, flags?: FlagStruc): A | null => {
  if (!dir || !flags) { return null; }
  const flagVal = flags[dir.key];
  const conditionMet = flagVal === dir.value
    || String(flagVal) === String(dir.value);
  return conditionMet ? dir.ifTrue : dir.ifFalse;
};


/**
 * type gaurd for sequence action type
 * @param  {string} act - action type
 * @return {act is ActsSeq}
 */
const isSeqActionType = (act?: string): act is ActsSeq =>
  !!(act && ACT_SEQ_ARR.find(v => v === act));


/**
 * type gaurd for sequence action
 * @param  {string} act - action
 * @return {act is ActsSeq}
 */
const isSeqAction = (act?: Actions): act is ActionSequence =>
  isSeqActionType(act?.type);


/**
 * type gaurd for sed action
 * @param  {Directive | null} dir
 * @return {dir is Directive<ActionSedReplace>}
 */
const isSedDirective = (dir: Directive | null): dir is Directive<ActionSedReplace> =>
  dir?.ifTrue?.type === ACT_MAP.sed || dir?.ifFalse?.type === ACT_MAP.sed;


/**
 * type gaurd for global (regex) sed action
 * @param  {Directive | null} dir
 * @return {dir is Directive<ActionSedReplace>}
 */
const isSedDirectiveG = (dir: Directive | null): dir is Directive<ActionSedReplace> =>
  isSedDirective(dir)
    && !!(dir?.ifTrue?.flags?.includes('g') || dir?.ifFalse?.flags?.includes('g'));


/**
 * escapes a string for use in a regex pattern as a string literal
 * @param  {string} pattern
 * @param  {boolean} [regexEscape=true] - whether to escape
 * @return {string}
 */
const toEscapedPattern = (pattern: string, regexEscape = true): string => {
  try {
    if (!regexEscape) { return pattern; }
    return RegExp.escape(pattern);
  } catch (_err) {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};


/**
 * creates a regex from a string or returns an existing regex
 * @param  {RegExp | string} pattern
 * @param  {boolean} [regexEscape=true] - whether to escape
 * @return {RegExp}
 */
const toRegex = (pattern: RegExp | string, regexEscape = true): RegExp =>
  (pattern instanceof RegExp
    ? pattern
    : new RegExp(toEscapedPattern(pattern, regexEscape)));


/**
 * create the regex directive pattern to match against
 * @param  {CommentOptionsR} options
 * @return {ReDirective}
 * @cached - saves from having re-init the regexs, decent perf gain if called rapidly
 */
const createDirectiveRegex = (() => {
  let cache: ReDirective | null = null;
  // strict equality cache dump based on options - WeakMap not worth the overhead
  let lastOptions: CommentOptionsR | null = null;
  return (options: CommentOptionsR): ReDirective => {
    // clear cache if options changed
    if (lastOptions !== options) {
      cache = null;
      lastOptions = options;
    }
    // check cache
    if (cache) { return cache; }
    const [singleStart, singleEnd] = options.single;
    const escape = options.escape;
    const start = isString(singleStart)
      ? toEscapedPattern(singleStart, escape)
      : singleStart?.source;
    const end = isString(singleEnd)
      ? toEscapedPattern(singleEnd, escape)
      : singleEnd?.source;

    const id = toEscapedPattern(options.identifier);

    // non-loose anchors
    const [astart, aend] = options.loose
      ? ['', '']
      : [
        start.startsWith('^') ? '' : '^',
        end?.endsWith('$') ? '' : '\\s*?$',
      ];
    cache = {
      scar: toRegex(singleStart, escape), // single start
      scdr: singleEnd ? toRegex(singleEnd, escape) : null, // single end
      // could use /(?!)/ negative lookahead pattern need be to keep same logic
      mcar: options.multi[0] ? toRegex(options.multi[0], escape) : null, // multi start
      mcdr: options.multi[1] ? toRegex(options.multi[1], escape) : null, // multi end
      dir: !end
        ? new RegExp(`${astart}${start}\\s*${id}(.+)${aend.length ? '$' : ''}`)
        : new RegExp(`${start}\\s*${id}(.+?)\\s*?${end}${aend}`),
    };
    return cache;
  };
})();


// -----------------------------------------------------------------------------
// @id::parser(s)
// -----------------------------------------------------------------------------

/**
 * parses out the line count like '4L' from a param string
 * @val  {string} val
 * @param  {number} [def=1] - default count
 * @return {count: number; param: string;}
 * @internal
 */
const parseActionMeta = <S extends string | null = null>(val: string, def = 1, deli = null as S): {
  count: number;
  val: string;
  stop: S extends string ? string : null;
} => {
  const lineMatch = val.match(/(\d+)L$/);
  let count = def;
  if (lineMatch?.[1]) {
    count = Number.parseInt(lineMatch[1]);
    val = val.slice(0, -lineMatch[0].length);
  }


  let stop: null | string = null;
  // parse stop condition like '/@stop-condition'
  if (deli) {
    const stopMark = `${deli}@`;
    const stopIdx = val.lastIndexOf(stopMark);
    if (stopIdx !== -1) {
      stop = val.slice(stopIdx + stopMark.length);
      val = val.slice(0, stopIdx);
    }
    // remove end delimiter
    const endIdx = val.endsWith(deli) ? val.lastIndexOf(deli) : -1;
    val = endIdx === -1 ? val : val.slice(0, endIdx);
  }

  return {count, val, stop: stop as never};
};


/**
 * parses and caches an action spec string like 'rm=4L' into an action
 * @param  {string} spec             - action specification
 * @param  {CommentOptionsR} options - comment options
 * @return {Actions | null}
 * @internal
 */
const parseAction = (() => {
  // good perf gain, but it could lead to memory issues in absurd/extreme use cases
  let cache: null | Map<string, Actions | null>  = null;
  // strict equality cache dump based on options - WeakMap not worth the overhead
  let lastOptions: CommentOptionsR | null = null;
  return (spec: string, options: CommentOptionsR): Actions | null => {
    if (!cache && !options.disableCache) {
      cache = new Map<string, Actions | null>();
    }
    // clear cache if options changed
    if (cache && lastOptions !== options) {
      cache.clear();
      lastOptions = options;
      cache = options.disableCache ? null : cache;
    }
    // check cache
    const cres = cache ? cache.get(spec) : null;
    if (cres) { return cres; }

    let split: null | [string, string] = null;
    for (const iact of ACT_PREFIXS) {
      if (spec.startsWith(iact)) {
        split = [iact.replace('=', ''), spec.replace(iact, '')];
        break;
      }
    }

    const [act, param] = split ?? [];
    if (param === undefined) {
      const err = `[commentDirective:parseAction] bad/no action param: ${spec}`;
      if (options.throw) { throw new Error(err); }
      console.error(err);
      return null;
    }

    // noop
    if (act === 'no') {
      const {val, count, stop} = parseActionMeta(param, 1, options.delimiter);
      const result = { val, type: ACT_MAP.no, count, stop };
      cache && cache.set(spec, result);
      return result;
    }

    // remove X lines
    if (act === 'rm' && ((/^(line|@)/).test(param) || (/^\d+L$/).test(param))) {
      const {val, count} = parseActionMeta(param);
      const stop = val.startsWith('@') ? val.replace('@', '') : null;
      const result = { type: ACT_MAP.rml, count, val, stop };
      cache && cache.set(spec, result);
      return result;
    }

    // comment
    if (param.startsWith('comment')) {
      const atype = act === 'un' ? ACT_MAP.unc : act === 'rm' ? ACT_MAP.rmc : null;
      if (!atype) {
        // eslint-disable-next-line @stylistic/max-len
        const err = `[commentDirective:parseAction] 'comment' only works with 'rm' or 'un' - not '${act}': ${param}`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }
      // @note -> count is passed, but not implemented, probs not worth effort/overhead
      const result = { type: atype, count: parseActionMeta(param).count };
      cache && cache.set(spec, result);
      return result;
    }

    // append/prepend/shift/pop
    if (isSeqActionType(act) || act === 'fn') {
      const {val, count, stop} = parseActionMeta(param, 1, options.delimiter);
      if (!val && act !== 'pop' && act !== 'shift') {
        const err = `[commentDirective:parseAction] no ${act} 'value' found: ${param}`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }
      if (act === 'fn' && typeof options.fn !== 'function') {
        const err = `[commentDirective:parseAction] no 'fn' function found in options`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }
      const result = {
        val, type: ACT_MAP[act as ActsSeq], count, stop,
      };
      cache && cache.set(spec, result);
      return result;
    }

    // match sed pattern like /pattern/replacement/[flags][@stop][lineCount]
    if (act === 'sed') {
      const delimiter = options?.delimiter ?? '/';
      if (!param.startsWith(delimiter)) {
        const err = `[commentDirective:parseAction] bad sed syntax: ${param}`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }

      // manual parse sed
      const parts = [];
      let currentPart = '';
      let i = delimiter.length;
      while (i < param.length) {
        // handle escaped delimiter e.g: '/' becomes '\/'
        if (param[i] === '\\' && param.startsWith(delimiter, i + 1)) {
          currentPart += delimiter; // add delim itself to the cur part
          i += delimiter.length + 1; // skip over the escape char and the delim
        } else if (param.startsWith(delimiter, i)) {
          // found a non-escaped delimiter -> markin the end of a part
          parts.push(currentPart);
          currentPart = '';
          i += delimiter.length;
          // after finding pattern and replacement; the rest is meta
          if (parts.length === 2) {
            parts.push(param.slice(i));
            break;
          }
        } else {
          // append regular chars
          currentPart += param[i];
          i++;
        }
      }

      if (parts.length < 3) {
        const err = `[commentDirective:parseAction] bad sed syntax, not enough parts: ${param}`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }

      const [pattern, replacement, meta] = parts;
      if (!isString(pattern) || !isString(replacement)) {
        const err = `[commentDirective:parseAction] bad sed match: ${param}`;
        if (options.throw) { throw new Error(err); }
        console.error(err);
        return null;
      }

      // eslint-disable-next-line prefer-const
      let {val, count, stop} = parseActionMeta(meta ?? '', 0, options.delimiter);
      let flags = val;
      // re-parse out flags and stop
      const stopIndex = val.indexOf('@');
      if (stopIndex !== -1) {
        flags = val.slice(0, stopIndex);
        stop = val.slice(stopIndex + 1);
      } else {
        flags = val;
      }

      const flagChars = flags.split('');
      const result = {
        type: ACT_MAP.sed,
        pattern,
        replacement,
        flags: flagChars,
        stop,
        // if not global and no count default to 1
        count: !count && !flagChars.includes('g') ? 1 : count,
      };
      cache && cache.set(spec, result);
      return result;
    }

    const err = `[commentDirective:parseAction] unknown action: ${spec}`;
    if (options.throw) { throw new Error(err); }
    console.error(err);
    return null;
  };
})();


/**
 * parse directive line or null
 * @param  {null | string[]} parts   - directive parts
 * @param  {string} line             - line - used to report errors
 * @param  {CommentOptionsR} options - comment format
 * @return {Directive | null}
 */
const parseDirective = (
  parts: null | string[],
  line: string,
  options: CommentOptionsR,
): Directive | null => {
  if (!parts) { return null; }
  const [condSpec, ifTrue, ifFalse] = parts;
  // condSpec is like "alt=1"
  const condMatch = condSpec?.split('=');
  if (!condMatch) {
    const err = `[commentDirective:parseDirective] no/bad condition match: ${line}`;
    if (options.throw) { throw new Error(err); }
    console.error(err);
    return null;
  }
  const [key, val] = condMatch;
  if (!key || val === undefined) {
    const err = `[commentDirective:parseDirective] bad key/value (${key}/${val}): ${line}`;
    if (options.throw) { throw new Error(err); }
    console.error(err);
    return null;
  }
  if (!ifTrue) {
    const err = `[commentDirective:parseDirective] missing required true condition: ${line}`;
    if (options.throw) { throw new Error(err); }
    console.error(err);
    return null;
  }
  return {
    key,
    value: Number.isInteger(Number(val)) ? Number(val) : val,
    ifTrue: parseAction(ifTrue, options),
    ifFalse: ifFalse ? parseAction(ifFalse, options) : null,
  } as const;
};


// -----------------------------------------------------------------------------
// @id::main/logic
// -----------------------------------------------------------------------------


/**
 * applies a directive action, mutates the output array, and returns the new line index
 * @param  {number} idx                - current index in lines
 * @param  {Actions | null} action     - action to apply
 * @param  {(string | number)[]} out   - output array (mutated)
 * @param  {(string | number)[]} lines - source lines array
 * @param  {CommentOptionsR} options   - processor options
 * @param  {ReDirective} re            - compiled regex pattern
 * @return {number}                    - new index to continue processing from
 * @internal
 */
const applyDirective = (
  idx: number,
  action: Actions | null,
  out: (string | number)[],
  lines: (string | number)[],
  options: CommentOptionsR,
  re: ReDirective,
): number => {
  let firstLine = lines[idx] ?? '';
  if (isNumber(firstLine)) { out.push(firstLine); return idx; }
  // if no action or action condition is not met
  if (!action) {
    // always drop the directive comment itself
    if (re.dir.test(firstLine)) { return idx; }
    out.push(firstLine);
    return idx;
  }

  let jdx = idx + 1;
  const ekeep = options.keepEmpty ?? false;
  const dkeep = options.keepDirective ?? false;
  const cnest = options.nested ?? false;

  // rm the next - count lines
  if (action?.type === ACT_MAP.rml) {
    const {
      count,
      stop,
    } = action;
    ekeep && Array(count + (dkeep ? 0 : 1)).fill('').forEach(v => out.push(v));
    if (!stop) { return idx + count; }
    const reStop = new RegExp(toEscapedPattern(stop, options.escape));
    let jdx = idx;
    let processedLines = 0;
    while (jdx < lines.length && (processedLines < count || stop)) {
      jdx++;
      processedLines++;
      const currentLine = lines[jdx] ?? '';
      if (isString(currentLine) && currentLine.match(reStop)) { break; }
    }
    return jdx - (dkeep ? 1 : 0);
  }

  // custom fn or no-op
  // @TODO -> decide if no=op should have the ablity to be apply on block/<N>L level;
  //          e.g: if no=op/9L should apply to the next 9 lines invalidating other actions
  if (action.type === ACT_MAP.fn || action.type === ACT_MAP.no) {
    const {
      count,
      stop,
      val,
    } = action;
    const reStop = stop ? new RegExp(toEscapedPattern(stop, options.escape)) : null;
    // loop and replace till count or stop
    let processedLines = 0;
    const input: (string | number)[] = [];
    const start = jdx;
    while (jdx < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[jdx] ?? '';
      input.push(lines[jdx] ?? '');
      jdx++;
      processedLines++;
      if (reStop && isString(currentLine) && currentLine.match(reStop)) { break; }
    }
    const output = action.type === ACT_MAP.no || !options?.fn
      ? input
      : options?.fn(input, val, start);
    output.forEach(val => out.push(val));
    return jdx - 1;
  }

  // sed'in -> line
  if (action.type === ACT_MAP.sed) {
    const {
      pattern,
      replacement,
      flags,
      count,
      stop,
    } = action;
    const rePatt = new RegExp(toEscapedPattern(pattern, options.escape), flags.length
      ? flags.join('')
      : undefined);
    const reStop = stop ? new RegExp(toEscapedPattern(stop, options.escape)) : null;
    // loop and replace till count or stop
    let processedLines = 0;
    while (jdx < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[jdx] ?? '';
      const sline = isNumber(currentLine) ? null : currentLine;
      out.push(sline === null ? currentLine : sline.replace(rePatt, replacement));
      jdx++;
      processedLines++;
      // stop break
      if (reStop && sline && sline.match(reStop)) { break; }
    }
    return jdx - 1;
  }


  // append/prepend/shift/pop
  if (isSeqAction(action)) {
    const {
      count,
      stop,
      val,
    } = action;
    const reStop = stop ? new RegExp(toEscapedPattern(stop, options.escape)) : null;
    // loop and replace till count or stop
    let processedLines = 0;
    while (jdx < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[jdx] ?? '';
      if (isNumber(currentLine)) {
        out.push(currentLine);
        jdx++;
        processedLines++;
        continue;
      }
      let nxt = currentLine;
      switch (action.type) {
      case 'append':
      case 'push':
        nxt = nxt.endsWith(val) ? nxt : nxt + val;
        break;
      case 'prepend':
      case 'unshift':
        nxt = nxt.startsWith(val) ? nxt : val + nxt;
        break;
      case 'shift':
        nxt = nxt.startsWith(val) ? nxt.slice(val.length) : nxt;
        break;
      case 'pop':
        nxt = nxt.endsWith(val) ? nxt.slice(0, -val.length) : nxt;
        break;
      }
      out.push(nxt);
      jdx++;
      processedLines++;
      if (reStop && currentLine.match(reStop)) { break; }
    }
    return jdx - 1;
  }

  const isUncomment = action.type === ACT_MAP.unc;
  const isRmcomment = action.type === ACT_MAP.rmc;
  // return if not rm/un comment as this is a fall-through case (should never happen)
  if (!isRmcomment && !isUncomment) { return idx; }

  firstLine = lines[jdx] ?? '';
  // since un/rm comment doesn't implment count we can simply ingore empty lines
  if (!firstLine || isNumber(firstLine) || !firstLine.trim().length) {
    ekeep && out.push(firstLine ?? '');
    return jdx;
  }

  // helper for opt: false=none; true=both; 1=single only; 2=multi only
  const keepPad = (opt: boolean | 1 | 2, isSingle = true): 0 | 1 => (opt === true
        || (opt === 1 && isSingle)
        || (opt === 2 && !isSingle))
    ? 1
    : 0;

  const { keepPadStart = true, keepPadEnd = 2, keepPadIn = 2, keepPadEmpty } = options;
  type PadArg = [
    pos: -1 | 1 | -2 | 2, // -1=single-start, 1=single-end, -2=muti-start, 2=multi-end
    reg: RegExpMatchArray,
    keepEmpty?: number, // for inline multi-line padding
  ];
  const addPad = (arg: PadArg[], rtn: string) => {
    for (const [pos, reg, keepEmpty] of arg) {
      const start = Math.abs(reg[0].length - reg[0].trimStart().length);
      const end = Math.abs(reg[0].length - reg[0].trimEnd().length);
      const single = Math.abs(pos) === 1;
      const pend = pos > 0 && !keepPad(keepPadEnd, single)
        ? 0 // effectivly trimEnd
        : (((0 > pos ? start : end)
            * keepPad(0 > pos ? keepPadStart : keepPadEnd, single)));
      const total = ((0 > pos ? end : start) * keepPad(keepPadIn, single)) + pend;
      const pad = total ? ' '.repeat(total) : '';
      rtn = 0 > pos ? pad + rtn : rtn + pad;
      // remove empty-line whitespace only
      rtn = !keepEmpty && !keepPadEmpty && !rtn.trim().length ? '' : rtn;
    }
    return rtn;
  };

  // regex/match helpers
  const reMcar = re.mcar;
  const reMcdr = re.mcdr;
  const imcar = reMcar ? firstLine.search(reMcar) : -1;
  const scar = imcar === -1 ? firstLine.match(re.scar) : null;
  // single-line comment - only if no mult-line comment e.g: /* // match multi */
  if (scar) {
    const iscar = scar.index as number;
    // captures whitespace within comment marker pattern; e.g: spaces in: \s*
    const pre = firstLine.substring(0, iscar);
    // single-line comment without end marker; e.g: // or #
    if (!re.scdr) {
      // un=comment
      isUncomment && out.push(pre + addPad(
        [ [-1, scar] ],
        firstLine.substring(iscar + scar[0].length), // content
      ));
      // rm=comment
      isRmcomment && (ekeep || pre.trim().length > 0)
          && out.push(pre + (ekeep && !dkeep ? '\n' : ''));
      return jdx;
    }

    // single-line comment with an end marker; e.g: <!-- -->
    const scdr = firstLine.match(re.scdr);
    const iscdr = scdr?.index ?? -1;
    if (scdr && iscdr > iscar) {
      const endMatch = firstLine.substring(iscdr).match(re.scdr);
      const post = firstLine.substring(
        iscdr + (endMatch ? endMatch[0].length : 0), // comment end length
      );
      // un=comment
      isUncomment && out.push(pre + addPad(
        [ [-1, scar, pre.trim().length], [1, scdr, post.trim().length] ],
        firstLine.substring(iscar + scar[0].length, iscdr), // content
      ) + post);
      // rm=comment
      isRmcomment && (ekeep || (pre + post).trim().length > 0) && out.push(pre + post);
      return jdx;
    }
  }

  // no mult regex
  if (!reMcar || !reMcdr) { return idx; }

  // if not start match bail
  if (imcar === -1) { out.push(firstLine); return jdx; }

  // multi-comment block identification
  let meLineIdx = -1;
  let meIdx = -1; // index in the end line, after the closing marker
  let meMatch: RegExpMatchArray | null = null;
  let msMatchP: RegExpMatchArray | null = null;

  let nlvl = 0;
  for (let j = jdx; j < lines.length; j++) {
    const jline = lines[j] ?? '';
    if (isNumber(jline)) { continue; }
    // non-nested fast-pass; find the first opening marker and first closing marker after it
    if (!cnest) {
      msMatchP = msMatchP ?? firstLine.substring(imcar).match(reMcar)!;
      // on the first line, search after the head marker
      const offset = (j === jdx) ? imcar + msMatchP![0].length : 0;
      meMatch = jline.substring(offset).match(reMcdr);
      if (!meMatch) { continue; }
      // found the first closing marker, so the block ends here
      meLineIdx = j;
      meIdx = offset + meMatch.index! + meMatch[0].length;
      break;
    }

    // counting and pairing opening/closing markers (e.g: /* ... /* ... */ ... */)
    let fromIdx = (j === jdx) ? imcar : 0;
    while (fromIdx < jline.length) {
      const msMatch = jline.substring(fromIdx).match(reMcar);
      const meMatchP = jline.substring(fromIdx).match(reMcdr);
      const headIdx = msMatch ? msMatch.index! + fromIdx : -1;
      const tailIdx = meMatchP ? meMatchP.index! + fromIdx : -1;

      // prioritize the earliest marker found on the line
      if (headIdx !== -1 && (headIdx < tailIdx || tailIdx === -1)) {
        nlvl++;
        fromIdx = headIdx + msMatch![0].length;
        continue; // continue scanning the same line after this head marker
      }

      // if no tail marker, we done with this line
      if (tailIdx === -1) { break; }
      nlvl--;
      fromIdx = tailIdx + meMatchP![0].length;
      if (nlvl === 0) {
        // we found the final closing marker that balances the first opening one
        meLineIdx = j;
        meIdx = fromIdx;
        meMatch = meMatchP;
        j = lines.length; // break outer loop immediately - faster loop
        break;
      }
    }
  }

  // if no closing marker was found, treat as unclosed and do nothing/ignore
  if (meLineIdx === -1) { return lines.length - 1; }

  // find the specific end match - if nested re-match
  const msMatchF = msMatchP ?? firstLine.substring(imcar).match(reMcar);
  // gotta bail if theres not start/end
  if (!msMatchF || !meMatch) { return meLineIdx; }

  // if rm comment use the defined block boundaries
  if (action.type === ACT_MAP.rmc) {
    const pre = firstLine.substring(0, imcar);
    const post = ((lines[meLineIdx] ?? '') as string).substring(meIdx);
    // single line block
    if (jdx === meLineIdx) {
      (pre.length || post.length || ekeep)
        && out.push(pre
        + addPad([ [-2, msMatchF, pre.length], [2, meMatch, post.length] ], '')
        + post);
      return meLineIdx;
    }
    // multi-line block
    const mpre = pre + addPad([ [-2, msMatchF, pre.length] ], '');
    (ekeep || mpre.trim().length > 0) && out.push(mpre);
    // add empty lines for the middle part
    const emptyLines = meLineIdx - jdx - (dkeep ? 1 : 0);
    (ekeep && emptyLines > 0) && out.push(...Array(emptyLines).fill(''));
    const mpost = addPad([ [2, meMatch, post.length] ], '') + post;
    (ekeep || mpost.trim().length > 0) && out.push(mpost);
    return meLineIdx;
  }

  // bail on any thing other than uncommnet
  if (action?.type !== ACT_MAP.unc) { return meLineIdx; }

  // single line
  if (jdx === meLineIdx) {
    const pre = firstLine.substring(0, imcar);
    const post = firstLine.substring(meIdx);
    out.push(pre
      + addPad([ [-2, msMatchF, pre.length], [2, meMatch, post.length] ],
        firstLine.substring(
          imcar + msMatchF[0].length,
          meIdx - meMatch[0].length,
        )) // content
     + post);
    return meLineIdx;
  }

  // multi-line uncomment
  for (let j = jdx; j <= meLineIdx; j++) {
    const jline = (lines[j] ?? '') as string;
    // first line
    if (j === jdx) {
      const pre = jline.substring(0, imcar);
      out.push(pre + addPad(
        [ [-2, msMatchF, pre.length] ],
        jline.substring(imcar + msMatchF[0].length),
      )); // pre + content
      continue;
    }
    // last line
    if (j === meLineIdx) {
      const post = jline.substring(meIdx);
      out.push(addPad(
        [ [2, meMatch, post.length] ],
        jline.substring(0, meIdx - meMatch[0].length),
      ) + post); // content + post
      continue;
    }
    // middle line(s)
    out.push(jline);
  }

  return meLineIdx;
};


/**
 * comment template directive/metaprogramming/replacer
 * - scans for '// ###[IF]' directive & conditionally include/remove/modify based on flags
 * - basically a line-oriented preprocessor built in lieu of a real templating engine
 * @templates
 * - remove lines    : rm=<N>L
 * - remove comment  : rm=comment
 * - un-comment      : un=comment
 * - sed-like replace: sed=/pattern/replacement/[flags][<N>L]
 * @param  {string} tmpl                   - template to process
 * @param  {FlagStruc} flags               - directive flags
 * @param  {[CommentOptions]} options - directive comment format - default js
 * @return {string}
 */
export const commentDirective = (
  tmpl: string,
  flags: FlagStruc,
  optionsP: Partial<CommentOptions> | null = null,
): string => {
  const out: (string | number)[] = [];
  let lines: (string | number)[] = [];
  // 'i' while loop variable
  let iglobal = 0; // global sed i start - prevents re-run of global loop
  let hglobal = 0; // if it has global sed - for perf gains in main loop
  let ibreak = -1; // if ibreak is zero - struc is stable, break and return
  let istack =  0; // 'stacked' comment directive count
  let iquitAt = 0; // loop breaker to prevent going to infinity and beyond
  // index-based comment directive stack used to re-insert directives
  const directiveStack: string[] = [];
  const looseStack: [string, string][] = [];

  const options = (optionsP ?? DEFAULT_OPTIONS) as CommentOptionsR;
  // set props to better cache createDirectiveRegex rather than object.assign
  if (!options.delimiter) { options.delimiter = DEFAULT_OPTIONS.delimiter; }
  // default js comment format
  if (!options.single) { options.single = DEFAULT_OPTIONS.single; }
  if (!options.multi) { options.multi = DEFAULT_OPTIONS.multi; }
  // directive identifier
  const identifier = options?.identifier ?? DEFAULT_OPTIONS.identifier;
  if (!options.identifier) { options.identifier = identifier; }

  // keep directives - if loose forced to keep otherwise
  const loose = options?.loose;
  const looseRm = loose ? `${LOOSE_PLACEHOLE}_RM` : null; // filter remove placeholder
  const dkeep = options?.keepDirective;
  const re = createDirectiveRegex(options);
  // min directive line length: <id> a=1;rm=1L
  const minDirLen = options.identifier.length + 9;

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null => {
    if (looseRm) { line = line.replace(looseRm, ''); }
    // only cache lines with comment directive
    let match = re.dir.exec(line)?.[1];
    if (!match) { return null; }
    // rm trailing ;
    if (match.endsWith(';')) { match = match.slice(0, -1); }
    // split via ';' and then re-join parts that were split incorrectly (like a ';' in sed)
    const rawParts = match.split(';');
    const head = rawParts?.[0];
    if (head === undefined) { return null; }
    // condition is always the first part
    const result = [head];
    for (let i = 1; i < rawParts.length; i++) {
      const part = rawParts[i];
      if (part === undefined) { continue; }
      // action spec always start with 'prefix='
      if (ACT_PREFIXS.some(p => part?.startsWith(p))) {
        result.push(part);
        continue;
      }
      // not a new action, so its a continuation of the prv one
      result[result.length - 1] += ';' + part;
    }
    // must have a condition and one action - but we still rtn to report error
    return result;
  };


  // while & break iterative loop
  while (true) {
    let isGlobalSed = false;
    // 10000 loop limit - could happen with a bad user sed directive
    // eslint-disable-next-line @stylistic/max-len
    if (iquitAt > 1e4) { throw new Error('[commentDirective] 10,000-loop limit was hit, either a recursive loop or an absurd use-case; instead of going to infinity and beyond, bailing...'); }
    iquitAt++;
    // keep loop'ing till stable -> no comment directives left that make changes
    if (!ibreak) { break; }
    lines = out.length ? out.slice(0) : tmpl.split(/\r?\n/);

    // loose preprocessing involves replacing any content comment directive (let a = 1; // ###[IF])
    // with a placeholder and moving the actual directive below; far from elegant,
    // but it allows for the same pipeline without extra conditional logic
    lines = !loose || out.length
      ? lines
      : (lines as string[]).reduce((lout, line) => {
        // initial check(s) to bail out fast
        if (minDirLen >= line.length || line.indexOf(identifier) === -1) {
          return lout.concat(line);
        }
        const rdir = re.dir.exec(line)?.[0] ?? '';
        // if comment directive but on it's own line
        if (!line.replace(rdir, '').trim().length) { return lout.concat(line); }
        const id = dkeep ? `${LOOSE_PLACEHOLE}${looseStack.length}` : '';
        id.length && looseStack.push([id, rdir]);
        return lout.concat([line.replace(rdir, id), rdir + (looseRm as string)]);
      }, [] as string[]);

    // global sed loop(s)
    for (let i = iglobal; i < lines.length; i++) {
      const line = lines[i] as string;
      // initial check(s) to bail out fast
      if (minDirLen >= line.length || line.indexOf(identifier) === -1) { continue; }
      const parts = splitDirectiveLine(line);
      if (!parts) { continue; }
      const dir = parseDirective(parts, line, options);
      if (!isSedDirectiveG(dir)) { continue; }
      const action = getAction(dir, flags);
      if (!action) { continue; }
      hglobal = 1;
      const pre = lines.slice(0, i).join('\n');
      let target = lines.slice(i + 1);
      // if limit to N lines
      const post = (action.count ? target.slice(action.count) : []) as string[];
      target = action.count ? target.slice(0, action.count) : target;
      const prv = target.join('\n');
      const replaced = prv.replace(
        new RegExp(
          toEscapedPattern(action.pattern, options.escape),
          action.flags.join(''),
        ),
        action.replacement,
      );
      // no change
      if (prv === replaced) { continue; }
      // if diff exit for-loop & restart the main while loop
      tmpl = [pre, line, replaced].concat(post).join('\n');
      isGlobalSed = true;
    }
    // if global sed was applied, restart the main loop
    if (isGlobalSed) { continue; }

    // prevent re-run of global loop
    iglobal = lines.length + 1;
    // reset as new loop
    out.length = 0;
    ibreak = 0;
    istack = 0;

    // non-global sed main/loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      // initial check(s) to bail out fast
      if (istack // if 'stacked' comment directive, push to out, and re-evaluate
          || typeof line === 'number'
          || minDirLen >= line.length
          || line.indexOf(identifier) === -1) { out.push(line); continue; }
      const parts = splitDirectiveLine(line);
      if (!parts) { out.push(line); continue; }
      const dir = parseDirective(parts, line, options);
      if (!dir) { out.push(line); continue; }

      // skip sed global - already processed
      if (hglobal && isSedDirectiveG(dir)) { dkeep && out.push(line); continue; }
      const action = getAction(dir, flags);

      if (dkeep) {
        out.push(directiveStack.length);
        directiveStack.push(line);
      }
      // this while loop handles 'stacked' comment directives by pushing them
      // back into 'out' evaluate next time around, again, and again
      let nxtLine = lines[i + 1] ?? '';
      while (typeof nxtLine === 'string' && nxtLine.length > minDirLen && re.dir.test(nxtLine)) {
        out.push(nxtLine);
        ++i;
        ++ibreak;
        ++istack;
        nxtLine = lines[i + 1] ?? '';
      }

      const iprv = i;
      i = applyDirective(i, action, out, lines, options, re);
      if (iprv !== i) { ++ibreak; }
    }

    if (!ibreak || !out.length) { break; }
  }

  // re-add comment directive
  if (directiveStack.length) {
    for (let i = 0; i < out.length; i++) {
      if (typeof out[i] !== 'number') { continue; }
      out[i] = directiveStack[out[i] as number] ?? '';
    }
  }

  // re-join output
  tmpl = (looseRm
    ? out.filter(v => !String(v).includes(looseRm))
    : out).join('\n');

  // replace loose directives
  if (loose) { for (const [id, dir] of looseStack) { tmpl = tmpl.replace(id, dir); } }

  // explicity dump/clear out for better potential garbage collection
  out.length = 0;
  lines.length = 0;
  return tmpl;
};

export default commentDirective;
