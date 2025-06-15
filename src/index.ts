// -----------------------------------------------------------------------------
// @id::constants
// -----------------------------------------------------------------------------

// maps short action codes to their full names
const ACT_MAP = {
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
const ACT_PREFIXS = ['rm=', 'un=', 'sed=', 'append=', 'prepend=', 'unshift=', 'push=', 'shift=', 'pop='] as const;

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
  keepSpace: false,      // keep original whitespace without adjustment (default: false)
  // regex comment/language support options
  multi: [/\s*\/\*/, /\*\//],
  single: [/\s*\/\/\s*/, null], // eating the starting/surrounding space simplifies alignment
};


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
  /* disable white-space logic when removing/uncommenting (default: false) */
  keepSpace?: boolean;
  /* keep directive comments in the output (default: false) */
  keepDirective?: boolean;
  /* preserve empty removed comment/lines/directive lines (default: false) */
  keepEmpty?: boolean;
  /* multi-line comment/language support (default: c-like) */
  multi: [start: RegExp | string, end: RegExp | string] | [start: null, end: null];
  /* single-line comment/language support (default: c-like) */
  single: [start: RegExp | string, end?: null | RegExp | string];
};

// CommentOptions [R]equired
type CommentOptionsR = {
  [K in keyof CommentOptions]-?: CommentOptions[K];
};

// flags to control directive logic like: { prod: true, ver: 1, ok: 'cap' }
export type FlagStruc = Record<string, boolean | number | string>;

export type ActMap = typeof ACT_MAP;

export type ActsSeq = typeof ACT_SEQ_ARR[number];

export type ActionRemoveLines = { type: ActMap['rml']; count: number; };

export type ActionRemoveComment = { type: ActMap['rmc']; count: number; };

export type ActionUnComment = { type: ActMap['unc']; count: number; };

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

export type Actions = ActionRemoveLines | ActionRemoveComment | ActionUnComment
| ActionSedReplace | ActionSequence;


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
    // @ts-expect-error ingore & catch
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
 * @param  {string} param
 * @param  {number} [def=1] - default count
 * @return {count: number; param: string;}
 * @internal
 */
const parseLineCount = (param: string, def = 1): {count: number; param: string;} => {
  const lineMatch = param.match(/(\d+)L$/);
  let count = def;
  if (lineMatch?.[1]) {
    count = Number.parseInt(lineMatch[1]);
    param = param.slice(0, -lineMatch[0].length);
  }
  return {count, param};
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
    if (cache && cache.has(spec)) { return cache.get(spec)!; }

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

    // remove X lines
    if (act === 'rm' && (param.startsWith('line') || (/^\d+L$/).test(param))) {
      const result = { type: ACT_MAP.rml, count: parseLineCount(param).count };
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
      const result = { type: atype, count: parseLineCount(param).count };
      cache && cache.set(spec, result);
      return result;
    }

    // append/prepend/shift/pop
    if (isSeqActionType(act)) {
      let seq = param;
      let stop = null;

      const lcount = parseLineCount(seq);
      const count = lcount.count;
      seq = lcount.param;

      // parse stop condition like '/@stop-condition'
      const delimiter = options?.delimiter ?? '/';
      const stopMarker = `${delimiter}@`;
      const stopIndex = seq.lastIndexOf(stopMarker);
      if (stopIndex !== -1) {
        stop = seq.slice(stopIndex + stopMarker.length);
        seq = seq.slice(0, stopIndex);
      }
      // remove end delimiter
      const endDeliIndex = seq.endsWith(delimiter) ? seq.lastIndexOf(delimiter) : -1;
      if (endDeliIndex !== -1) { seq = seq.slice(0, endDeliIndex); }
      const val = seq;
      if (!val && act !== 'pop' && act !== 'shift') {
        const err = `[commentDirective:parseAction] no ${act} 'value' found: ${param}`;
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

      // parse meta string: flags, stop, count
      let restOfMeta = meta ?? '';
      let stop = null;
      let flags = '';
      const lcount = parseLineCount(restOfMeta, 0);
      let count = lcount.count;
      restOfMeta = lcount.param;

      const stopIndex = restOfMeta.indexOf('@');
      if (stopIndex !== -1) {
        flags = restOfMeta.slice(0, stopIndex);
        stop = restOfMeta.slice(stopIndex + 1);
      } else {
        flags = restOfMeta;
      }

      const flagChars = flags.split('');
      // if not global and no count default to 1
      count = !count && !flagChars.includes('g') ? 1 : count;

      const result = {
        type: ACT_MAP.sed, pattern, replacement, flags: flagChars, count, stop,
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
  const ekeep = options?.keepEmpty;
  const dkeep = options?.keepDirective;
  const cnest = options.nested;

  // rm the next - count lines
  if (action?.type === ACT_MAP.rml) {
    ekeep && Array(action.count + (dkeep ? 0 : 1)).fill('').forEach(v => out.push(v));
    return idx + action.count;
  }
  let firstLine = lines[idx] ?? '';
  if (isNumber(firstLine)) { out.push(firstLine); return idx; }

  // regex/match helpers
  // const re = createDirectiveRegex(options);
  const rmcar = re.mcar;
  const rmcdr = re.mcdr;

  // if no action or action condition is not met
  if (!action) {
    // always drop the directive comment itself
    if (re.dir.test(firstLine)) { return idx; }
    out.push(firstLine);
    return idx;
  }
  let jdx = idx + 1;

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
    // copy remaining lines in the range without modification
    while (jdx < lines.length && processedLines < count) {
      out.push(lines[jdx] ?? '');
      jdx++;
      processedLines++;
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

  const nextLine = lines[jdx];
  // since un/rm comment doesn't implment count we can simply ingore empty lines
  if (!nextLine || isNumber(nextLine) || !nextLine.trim().length) {
    ekeep && out.push(nextLine ?? '');
    return jdx;
  }
  // unless explict false, adjust white space
  const spaceAdjust = !ekeep && options.keepSpace !== true;
  // rm/trim end space(s)
  const spaceTrim = (val: string) => (spaceAdjust ? val.trimEnd() : val);

  const imcar = rmcar ? nextLine.search(rmcar) : -1;
  const scar = imcar === -1 ? nextLine.match(re.scar) : null;
  // single-line comment - only if no mult-line comment e.g: /* // match multi */
  if (scar) {
    const iscar = scar.index as number;
    const startOffset = scar[0].length;
    // captures whitespace within comment marker pattern; e.g: spaces in: \s*
    const headOffset = startOffset - scar[0].trimStart().length;
    const pre = nextLine.substring(0, iscar);

    // single-line comment without end marker; e.g: // or #
    if (!re.scdr) {
      // un=comment
      isUncomment && out.push(spaceTrim(
        pre
          + (spaceAdjust ? ' '.repeat(headOffset) : '') // separator; add marker space back
          + nextLine.substring(iscar + startOffset), // content
      ));
      // rm=comment
      isRmcomment && (ekeep || pre.trim().length > 0)
          && out.push(pre + (ekeep && !dkeep ? '\n' : ''));
      return jdx;
    }

    // single-line comment with an end marker; e.g: <!-- -->
    const iscdr = nextLine.search(re.scdr);
    if (iscdr > iscar) {
      const endMatch = nextLine.substring(iscdr).match(re.scdr);
      const post = nextLine.substring(
        iscdr + (endMatch ? endMatch[0].length : 0), // comment end length
      );
      // un=comment
      isUncomment && out.push(spaceTrim(pre
        + (spaceAdjust ? ' '.repeat(headOffset) : '') // separator
        + nextLine.substring(iscar + startOffset, iscdr) // content
        + post));
      // rm=comment
      isRmcomment && (ekeep || (pre + post).trim().length > 0) && out.push(pre + post);
      return jdx;
    }
  }

  // no mult regex
  if (!rmcar || !rmcdr) { return idx; }

  firstLine = lines[jdx] ?? '';
  if (isNumber(firstLine)) { out.push(firstLine); return jdx; }

  // if not start match bail
  const firstMatchIndex = firstLine.search(rmcar);
  if (firstMatchIndex === -1) { out.push(firstLine); return jdx; }

  // comment block identification
  let totalLines = 0;
  let headOffset = 0; // whitespace offset before the first opening marker
  let endLineIndex = -1;
  let endCharIndex = -1; // index in the end line, *after* the closing marker

  const headMatch = cnest ? null : firstLine.substring(firstMatchIndex).match(rmcar)!;
  headOffset = headMatch
    ? headMatch[0].length - headMatch[0].trimStart().length
    : 0;

  let nestingLevel = 0;
  for (let j = jdx; j < lines.length; j++) {
    const lineToScan = lines[j] ?? '';
    if (isNumber(lineToScan)) { continue; }
    // non-nested fast-pass -find the first opening marker and first closing marker after it
    if (!cnest) {
      // on the first line, search after the head marker
      const searchOffset = (j === jdx) ? firstMatchIndex + headMatch![0].length : 0;
      const tailMatch = lineToScan.substring(searchOffset).match(rmcdr);
      if (!tailMatch) { continue; }
      // found the first closing marker, so the block ends here
      endLineIndex = j;
      totalLines = j - (jdx - (ekeep && !dkeep ? 1 : 0));
      endCharIndex = searchOffset + tailMatch.index! + tailMatch[0].length;
      break;
    }

    // counting and pairing opening/closing markers (e.g: /* ... /* ... */ ... */)
    let scanFromIndex = (j === jdx) ? firstMatchIndex : 0;
    while (scanFromIndex < lineToScan.length) {
      const headMatch = lineToScan.substring(scanFromIndex).match(rmcar);
      const tailMatch = lineToScan.substring(scanFromIndex).match(rmcdr);
      const headIndex = headMatch ? headMatch.index! + scanFromIndex : -1;
      const tailIndex = tailMatch ? tailMatch.index! + scanFromIndex : -1;

      // prioritize the earliest marker found on the line.
      if (headIndex !== -1 && (headIndex < tailIndex || tailIndex === -1)) {
        if (nestingLevel === 0) {
          // capture whitespace offset from the very first opening marker
          headOffset = headMatch![0].length - headMatch![0].trimStart().length;
        }
        nestingLevel++;
        scanFromIndex = headIndex + headMatch![0].length;
        continue; // continue scanning the same line after this head marker
      }

      // if no tail marker, we're done with this line
      if (tailIndex === -1) { break; }
      nestingLevel--;
      scanFromIndex = tailIndex + tailMatch![0].length;
      if (nestingLevel === 0) {
        // we found the final closing marker that balances the first opening one
        endLineIndex = j;
        totalLines = j - (jdx - (ekeep && !dkeep ? 1 : 0));
        endCharIndex = scanFromIndex;
        j = lines.length; // break outer loop immediately - faster loop
        break;
      }
    }
  }

  // if no closing marker was found, treat as unclosed and do nothing/ignore
  if (endLineIndex === -1) { return lines.length - 1; }

  // if rm comment use the defined block boundaries
  if (action.type === ACT_MAP.rmc) {
    const pre = firstLine.substring(0, firstMatchIndex);
    const mid = ekeep && totalLines ? '\n'.repeat(totalLines) : '';
    const post = ((lines[endLineIndex] ?? '') as string).substring(endCharIndex);
    const all = pre + mid + post;
    // ensure we dont add an extra line
    if (!all.length) { return endLineIndex; }
    for (const item of (pre + mid + post).split('\n')) { out.push(spaceTrim(item)); }
    return endLineIndex;
  }

  // bail on any thing other than uncommnet
  if (action?.type !== ACT_MAP.unc) { return endLineIndex; }

  const stitchLine = (lastLine = '', prefix = '', startContentIndex: number | null = null) => {
    if (startContentIndex === null) {
      const headMatch = lastLine.substring(firstMatchIndex).match(rmcar)!;
      startContentIndex = firstMatchIndex + headMatch[0].length;
    }
    if (!cnest) {
      const content = lastLine.substring(startContentIndex);
      // find and remove the end marker via relative index
      const lastMatchInContent = content.match(rmcdr)!;
      const finalContent = (spaceAdjust && !prefix.length && startContentIndex
        ? ' '.repeat(headOffset)
        : '')
      + (content.substring(0, lastMatchInContent.index)
      + (content.substring(lastMatchInContent.index! + lastMatchInContent[0].length)));
      return spaceTrim(prefix + finalContent);
    }
    const beforeEnd = lastLine.substring(0, endCharIndex);
    const beforeEndContent = beforeEnd.substring(
      startContentIndex,
      // tail finder & match
      beforeEnd.match(new RegExp(
        rmcdr.source.endsWith('$') ? rmcdr.source : rmcdr.source + '$',
      ))!.index!,
    );
    return prefix + beforeEndContent + lastLine.substring(endCharIndex);
  };

  // single line
  if (jdx === endLineIndex) {
    const line = (lines[jdx] ?? '') as string;
    out.push(stitchLine(line, line.substring(0, firstMatchIndex)));
    return endLineIndex;
  }

  // multi-line uncomment
  for (let j = jdx; j <= endLineIndex; j++) {
    const lineToModify = (lines[j] ?? '') as string;
    // first line
    if (j === jdx) {
      const prefix = (spaceAdjust && !lineToModify.substring(0, firstMatchIndex)?.length
        ? ' '.repeat(headOffset)
        : spaceAdjust ? '' : ' '.repeat(headOffset))
        + lineToModify.substring(0, firstMatchIndex);
      out.push(
        spaceTrim(prefix + lineToModify.substring(firstMatchIndex).replace(rmcar, '')),
      );
      continue;
    }
    // last line
    if (j === endLineIndex) {
      out.push(spaceTrim(stitchLine(lineToModify, '', 0)));
      continue;
    }
    // middle line(s)
    out.push(lineToModify);
  }

  return endLineIndex;
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
  let iquitAt = 0;
  // let doffset = 0; // directive offset
  const directiveStack: string[] = [];

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
  const dkeep = options?.keepDirective;
  const re = createDirectiveRegex(options);

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null => {
    // much faster to do a indexOf check initially (caching this fn isn't really worth it)
    if (line.indexOf(identifier) === -1) { return null; }
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
      } else {
        // not a new action, so its a continuation of the prv one
        result[result.length - 1] += ';' + part;
      }
    }
    // must have a condition and one action - but we still rtn to report error
    return result;
  };


  let iglobal = 0;
  let ibreak = -1;
  let istack =  0;
  // let istack = 0;
  // while & break iterative loop
  while (true) {
    // 10000 loop limit - could happen with a bad user sed directive
    // eslint-disable-next-line @stylistic/max-len
    if (iquitAt > 1e4) { throw new Error(`[commentDirective] 10,000-loop limit was hit, either a recursive loop or an absurd use-case; instead of going to infinity and beyond, bailing...`); }
    iquitAt++;

    // keep loop'ing till stable -> no comment directives left that make changes
    if (!ibreak) { break; }
    lines = out.length ? out.slice(0) : tmpl.split(/\r?\n/);
    // const lines: string[] = out.length ? out : tmpl.split(/\r?\n/);
    let passChanged = false;

    // global sed loop(s)
    for (let i = iglobal; i < lines.length; i++) {
      const line = lines[i] as string;
      const parts = splitDirectiveLine(line);
      if (!parts) { continue; }
      const dir = parseDirective(parts, line, options);
      if (!isSedDirectiveG(dir)) { continue; }
      const action = getAction(dir, flags);
      if (!action) { continue; }
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
      passChanged = true;
    }

    // if global sed was applied, restart the main loop
    if (passChanged) { continue; }
    // prevent re-run of global loop
    iglobal = lines.length + 1;
    // reset as new loop
    out.length = 0;
    ibreak = 0;
    istack = 0;

    // non-global sed main/loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      // // this is a bit of a head
      if (istack) { out.push(line); continue; }
      if (isNumber(line)) { out.push(line); continue; }
      const parts = splitDirectiveLine(line);
      const dir = parseDirective(parts, line, options);
      if (!dir) { out.push(line); continue; }

      // skip sed global; only happen if keeping directive
      if (isSedDirectiveG(dir)) { dkeep && out.push(line); continue; }

      if (dkeep) {
        out.push(directiveStack.length);
        directiveStack.push(line);
      } else if (loose) {
        // @ts-expect-error if loose we have to rm/hack the directive (should silce?)
        lines[i] = lines[i].replace(re.dir.exec(line)?.[0] ?? '', '');
        // if chars then we need to save content in: content // ###[IF]prod=1
        (lines[i] as string)?.trim()?.length && out.push(lines[i] ?? '');
      }
      // this while loop handles 'stacked' comment directives by pushing them
      // back into 'out' evaluate next time around, again, and again
      let nxtLine = lines[i + 1] ?? '';
      while (isString(nxtLine) && nxtLine?.length && re.dir.test(nxtLine)) {
        out.push(nxtLine);
        ++i;
        ++ibreak;
        ++istack;
        nxtLine = lines[i + 1] ?? '';
      }

      const iprv = i;
      // const iout = out.length;
      const action = getAction(dir, flags);
      // @todo: remove this mutation/pass-around-logic
      i = applyDirective(i, action, out, lines, options, re);

      if (iprv !== i) { ++ibreak; }
    }

    if (!ibreak || !out.length) { break; }

  }

  // re-add comment directives
  if (dkeep) {
    for (let i = 0; i < out.length; i++) {
      if (isNumber(out[i])) {
        out[i] = directiveStack[out[i] as number] ?? '';
      }
    }
  }

  tmpl = out.join('\n');
  // explicity dump/clear out for better garbage managment
  out.length = 0;
  lines.length = 0;
  return tmpl;
};

export default commentDirective;

