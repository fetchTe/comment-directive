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

const ACT_SEQ_ARR = [
  'append',
  'prepend',
  'unshift',
  'push',
  'shift',
  'pop',
] as const;
const ACT_PREFIXS = (['rm', 'un', 'sed', ...ACT_SEQ_ARR] as const)
  .map(p => `${p}=` as const);

// default c-like comment format (js/rust/c)
const DEFAULT_OPTIONS: CommentOptionsR = {
  delimiter: '/',
  keepDirective: false,
  looseDirective: false,
  spaceAdjust: true,
  keepEmptyLines: false,
  escape: true,
  identifier: '###[IF]',
  single: [/\s*\/\/\s*/, null],
  // eating the space before the comment makes it easier to work with inline-comments
  disableCache: false,   // if memory is a concern in absurd/extream use cases (default: false)
  multi: [/\s*\/\*/, /\*\//],
};

// -----------------------------------------------------------------------------
// @id::types
// -----------------------------------------------------------------------------
export type CommentOptions = {
  single: [start: RegExp | string, end?: null | RegExp | string];
  multi: [start: RegExp | string, end: RegExp | string] | [start: null, end: null];
  /* disable white-space logic when removing/uncommenting (default: true) */
  spaceAdjust?: boolean;
  /* keep directive comments in the output (default: false) */
  keepDirective?: boolean;
  /* allows directives on lines with other content (default: false) */
  looseDirective?: boolean;
  /* change sed delimiter (default: '/') */
  delimiter?: string;
  /* preserve empty removed comment/lines/directive lines (default: false) */
  keepEmptyLines?: boolean;
  /* escape sed (default: true) */
  escape?: boolean;
  /* the acutal comment directive identifier (default: '###[IF]') */
  identifier?: string;
  /* if memory is a concern while processing huge/many different directives (default: false) */
  disableCache?: boolean;
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
 * @cached - saves us the trouble of re-initing & passing around a complex regex object
 * @param  {CommentOptionsR} options
 * @return {ReDirective}
 */
const createDirectiveRegex = (() => {
  // strict equality cache based on options - option Map/WeakMap not worth overhead
  let cache: ReDirective | null = null;
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
    const [astart, aend] = options.looseDirective
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
  // good perf gain, but it could lead to memory issues in absurd/extream use cases
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
      console.error(`[commentDirective:parseAction] bad/no action param: ${spec}`);
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
        console.error(`[commentDirective:parseAction] 'comment' only works with 'rm' or 'un' - not '${act}': ${param}`);
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
        console.error(`[commentDirective:parseAction] no ${act} 'value' found: ${param}`);
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
        console.error(`[commentDirective:parseAction] bad sed syntax: ${param}`);
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
        console.error(`[commentDirective:parseAction] bad sed syntax, not enough parts: ${param}`);
        return null;
      }

      const [pattern, replacement, meta] = parts;
      if (!isString(pattern) || !isString(replacement)) {
        console.error(`[commentDirective:parseAction] bad sed match: ${param}`);
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

    console.error(`[commentDirective:parseAction] unknown action: ${spec}`);
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
    console.error(`[commentDirective:parseDirective] no/bad condition match: ${line}`);
    return null;
  }
  const [key, val] = condMatch;
  if (!key || val === undefined) {
    console.error(`[commentDirective:parseDirective] bad condition key/value`, {key, val});
    return null;
  }
  if (!ifTrue) {
    console.error(`[commentDirective:parseDirective] missing required true condition: ${line}`);
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
  i: number,
  action: Actions | null,
  out: (string | number)[],
  lines: (string | number)[],
  options: CommentOptionsR,
  // addStack: ([idx, line]: [idx: number, line: string])=> void,
): number => {
  const ekeep = options?.keepEmptyLines;
  const dkeep = options?.keepDirective;
  // rm the next - count lines
  if (action?.type === ACT_MAP.rml) {
    ekeep && Array(action.count + (dkeep ? 0 : 1)).fill('').forEach(v => out.push(v));
    return i + action.count;
  }
  // regex/match helpers
  const re = createDirectiveRegex(options);

  // if no action or action condition is not met
  if (!action) {
    const currentLine = lines[i] ?? '';
    // always drop the directive comment itself
    if (currentLine && !isNumber(currentLine) && re.dir.test(currentLine)) {
      // addStack([i - 1, currentLine]);
      return i;
    }
    out.push(currentLine);
    return i;
  }
  let j = i + 1;

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
    while (j < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[j] ?? '';
      const sline = isNumber(currentLine) ? null : currentLine;
      out.push(sline === null ? currentLine : sline.replace(rePatt, replacement));
      j++;
      processedLines++;
      // stop break
      if (reStop && sline && sline.match(reStop)) { break; }
    }
    // copy remaining lines in the range without modification
    while (j < lines.length && processedLines < count) {
      const currentLine = lines[j];
      out.push(currentLine ?? '');
      j++;
      processedLines++;
    }
    return j - 1;
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
    while (j < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[j] ?? '';
      if (isNumber(currentLine)) {
        out.push(currentLine);
        j++;
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
      j++;
      processedLines++;
      if (reStop && currentLine.match(reStop)) { break; }
    }
    return j - 1;
  }

  const isUncomment = action.type === ACT_MAP.unc;
  const isRmcomment = action.type === ACT_MAP.rmc;
  // return if not rm/un comment as this is a fall-through case (should never happen)
  if (!isRmcomment && !isUncomment) { return i; }

  let currentLine = lines[j];
  // since un/rm comment doesn't implment count we can simply ingore empty lines
  if (!currentLine || isNumber(currentLine) || !currentLine.trim().length) {
    ekeep && out.push(currentLine ?? '');
    return j;
  }
  // unless explict false, adjust white space
  const spaceAdjust = !ekeep && options.spaceAdjust !== false;
  // rm/trim end space(s)
  const spaceTrim = (val: string) => (spaceAdjust ? val.trimEnd() : val);

  // check for single-line comment - only if no mult-line comment e.g: /* // match multi */
  const imcar = re.mcar ? currentLine.search(re.mcar) : -1;
  const scar = imcar === -1 ? currentLine.match(re.scar) : null;
  if (scar) {
    const iscar = scar.index as number;
    let beforeComment = currentLine.slice(0, iscar);
    // account for white space before comment
    if (spaceAdjust) {
      beforeComment = ' '.repeat(Math.max(0, currentLine.length - currentLine.trimStart().length))
        + beforeComment;
    }

    // single-line comment without end marker (like // or #)
    if (!re.scdr) {
      const commentStartLength = scar[0].length;
      const commentContent = currentLine.slice(iscar + commentStartLength);
      if (isUncomment) {
        out.push(spaceTrim(`${beforeComment}${commentContent}`));
        return j;
      }
      (ekeep || beforeComment.trim().length > 0)
        && out.push(beforeComment + (ekeep && !dkeep ? '\n' : ''));
      return j;
    }

    // single-line comment with end marker like HTML: <!-- --> (if multi nulled out)
    beforeComment = currentLine.slice(0, iscar);
    const iscdr = currentLine.search(re.scdr);
    if (iscdr > iscar) {
      const commentStartLength = scar[0].length;
      // slice and match ending, like: -->
      const singleEndMatch = currentLine.slice(iscdr).match(re.scdr);
      const commentEndLength = singleEndMatch ? singleEndMatch[0].length : 0;
      const afterComment = currentLine.slice(iscdr + commentEndLength);
      if (isUncomment) {
        // add adjusted white space if empty space
        beforeComment = currentLine.slice(0, iscar);
        if (spaceAdjust && !beforeComment.trim().length) {
          beforeComment = beforeComment + ' '.repeat(commentStartLength);
        }
        out.push(spaceTrim(`${beforeComment}${currentLine.slice(
          iscar + commentStartLength,
          iscdr,
        )}${afterComment}`));
        return j;
      }
      const resultLine = `${beforeComment}${afterComment}`;
      (ekeep || resultLine.trim().length > 0) && out.push(resultLine);
      return j;
    }
  }

  // no multi
  if (!re.mcar || !re.mcdr) { return i; }

  // check if start/end patterns equal -> like python ('''|""")
  const sameStartEnd = re.mcar.source === re.mcdr.source;
  let imcdr = -1;
  if (imcar !== -1) {
    // for same start/end patterns, find the next occurrence after the start
    if (sameStartEnd) {
      const nextMatch = currentLine.slice(imcar + 1).search(re.mcdr);
      if (nextMatch !== -1) {
        imcdr = imcar + 1 + nextMatch;
      }
    } else {
      // different start/end patterns
      imcdr = currentLine.search(re.mcdr);
    }
  }

  // if single-line multi-line comment case
  if (imcar !== -1 && imcdr !== -1 && imcdr > imcar) {
    // get the actual matched comment markers to know their length
    const commentStartMatch = currentLine.slice(imcar).match(re.mcar);
    const commentEndMatch = currentLine.slice(imcdr).match(re.mcdr);
    const commentStartLength = commentStartMatch ? commentStartMatch[0].length : 3;
    const commentEndLength = commentEndMatch ? commentEndMatch[0].length : 3;
    let beforeComment = currentLine.slice(0, imcar);
    const commentContent = currentLine.slice(imcar + commentStartLength, imcdr);
    const afterComment = currentLine.slice(imcdr + commentEndLength);

    // uncomment: keep the content inside and rm markers
    if (isUncomment) {
      // add adjusted white space if empty space
      if (spaceAdjust && !beforeComment.trim().length) {
        beforeComment = ' '.repeat(Math.max(
          0,
          currentLine.length - currentLine.trimStart().length,
        ));
      }
      out.push(spaceTrim(`${beforeComment}${commentContent}${afterComment}`));
      return j;
    }

    // remove comment: comment + content -> keeping the rest of the line
    const resultLine = `${beforeComment}${afterComment}`;
    (ekeep || resultLine.trim().length > 0)
      && out.push(resultLine + (ekeep && !dkeep ? '\n' : ''));
    return j;
  }

  // if no muli-line comment start on current line, nothing left to do
  let lmcar = currentLine.search(re.mcar);
  if (lmcar === -1) { return i; }

  // multi-line comment
  const commentLines: (string | number)[] = [];
  let inComment = false;
  let beforeComment = '';
  let afterComment = '';
  let commentStartLength = 3; // default fallback
  let commentStartDiff = 0; // for whitespace adj
  let commentEndLength = 3; // default fallback
  let commentEndDiff = 0; // for whitespace adj
  while (j < lines.length) {
    currentLine = lines[j] ?? '';
    if (isNumber(currentLine)) {
      inComment && commentLines.push(currentLine);
      j++;
      continue;
    }
    lmcar = currentLine.search(re.mcar);
    if (!inComment && lmcar !== -1) {
      inComment = true;
      beforeComment = currentLine.slice(0, lmcar);
      const commentStartMatch = currentLine.slice(lmcar).match(re.mcar);
      commentStartLength = commentStartMatch ? commentStartMatch[0].length : 3;
      commentStartDiff = commentStartMatch && spaceAdjust
        ? commentStartMatch[0].length - commentStartMatch[0].trimStart().length
        : 0;
      const afterStart = currentLine.slice(lmcar + commentStartLength);

      // check for end marker on the same line (but after the start)
      let lmcdr = -1;
      if (sameStartEnd) {
        // if same start/end patterns -> find next occurrence
        lmcdr = afterStart.search(re.mcdr);
        // adjust to absolute position
        if (lmcdr !== -1) { lmcdr = lmcar + commentStartLength + lmcdr; }
      } else {
        lmcdr = currentLine.search(re.mcdr);
        // make sure end comes after start
        if (lmcdr !== -1 && lmcdr <= lmcar) { lmcdr = -1; }
      }

      // comment ends on the same line
      if (lmcdr !== -1) {
        const commentEndMatch = currentLine.slice(lmcdr).match(re.mcdr);
        commentEndLength = commentEndMatch ? commentEndMatch[0].length : 3;
        commentEndDiff = commentEndMatch && spaceAdjust
          ? commentEndMatch[0].length - commentEndMatch[0].trimEnd().length
          : 0;
        commentLines.push(currentLine.slice(lmcar + commentStartLength, lmcdr));
        afterComment = currentLine.slice(lmcdr + commentEndLength);
        j++;
        break;
      }
      commentLines.push(afterStart);
      j++;
      continue;
    }
    // end match or ++
    if (inComment) {
      const mcdr = currentLine.search(re.mcdr);
      if (mcdr !== -1) {
        commentLines.push(currentLine.slice(0, mcdr));
        const commentEndMatch = currentLine.slice(mcdr).match(re.mcdr);
        commentEndLength = commentEndMatch ? commentEndMatch[0].length : 3;
        afterComment = currentLine.slice(mcdr + commentEndLength);
        j++;
        break;
      }
      commentLines.push(currentLine);
      j++;
      continue;
    }
    j++;
  }


  if (inComment) {
    // uncomment: output the comment content and preserve surrounding
    if (isUncomment) {
      // add adjusted white space if empty space
      if (spaceAdjust && !beforeComment.trim().length) {
        beforeComment = beforeComment + ' '.repeat(commentStartDiff);
        afterComment = ' '.repeat(commentEndDiff) + afterComment;
      }
      for (let i = 0; i < commentLines.length; i++) {
        let line = commentLines[i];
        if (isNumber(line)) {
          out.push(line);
          continue;
        }
        if (!i) {
          line = `${beforeComment}${line}`;
        }
        if (i === commentLines.length - 1) {
          line = `${line}${afterComment}`;
        }
        out.push(spaceTrim(line ?? ''));
      }
      return j - 1;
    }
    // remove comment: in comment
    const resultLine = `${beforeComment}${afterComment}`
      + (ekeep ? '\n'.repeat(commentLines.length - (dkeep ? 1 : 0)) : '');
    (ekeep || resultLine.trim().length > 0) && out.push(resultLine);
    return j - 1;
  }

  return i;
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
  const loose = options?.looseDirective;
  const dkeep = options?.keepDirective;
  const reDirective = createDirectiveRegex(options).dir;

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null => {
    // much faster to do a indexOf check initially (caching this fn isn't really worth it)
    if (line.indexOf(identifier) === -1) { return null; }
    // only cache lines with comment directive
    let match = reDirective.exec(line)?.[1];
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
    // must have a condition and one action
    if (result.length < 2) { return null; }
    return result;
  };


  let iglobal = 0;
  let ibreak = -1;
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

    // non-global sed main/loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (isNumber(line)) { out.push(line); continue; }
      const parts = splitDirectiveLine(line);
      const dir = parseDirective(parts, line, options);
      if (!dir) { out.push(line); continue; }

      // skip sed global; only happen if keeping directive
      if (isSedDirectiveG(dir)) { dkeep && out.push(line); continue; }

      if (dkeep) {
        out.push(directiveStack.length);
        // console.log({directiveStack})
        directiveStack.push(line);
      } else if (loose) {
        // @ts-expect-error if loose we have to rm/hack the directive (should silce?)
        lines[i] = lines[i].replace(reDirective.exec(line)?.[0] ?? '', '');
        // if chars then we need to save content in: content // ###[IF]prod=1
        (lines[i] as string)?.trim()?.length && out.push(lines[i] ?? '');
      }
      // this while loop handles 'stacked' comment directives by pushing them
      // back into 'out' evaluate next time around, again, and again
      let nxtLine = lines[i + 1] ?? '';
      while (isString(nxtLine) && nxtLine?.length && reDirective.test(nxtLine)) {
        out.push(nxtLine);
        ++i;
        ++ibreak;
        nxtLine = lines[i + 1] ?? '';
      }

      const iprv = i;
      // const iout = out.length;
      const action = getAction(dir, flags);
      // @todo: remove this mutation/pass-around-logic
      i = applyDirective(i, action, out, lines, options);

      if (iprv !== i) { ++ibreak; }
    }

    if (!ibreak || !out.length) { break; }

  }

  // re-add comment directives
  if (dkeep) {
    for (let i = 0; i < out.length; i++) {
      if (isString(out[i])) {
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
