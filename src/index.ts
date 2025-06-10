// -----------------------------------------------------------------------------
// @id::constants
// -----------------------------------------------------------------------------
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
const DEFAULT_OPTIONS: CommentOptions & {delimiter: string} = {
  delimiter: '/',
  single: [/^\s*\/\/\s*/, null],
  // eating the space before the comment makes it easier to work with inline-comments
  multi: [/\s*\/\*/, /\*\//],
};

// -----------------------------------------------------------------------------
// @id::types
// -----------------------------------------------------------------------------
export type CommentOptions = {
  single: [start: RegExp | string, end?: null | RegExp | string];
  multi: [start: RegExp | string, end: RegExp | string];
  /* disable white-space logic when removing/uncommenting (default: true) */
  spaceAdjust?: false;
  /* keep directive comments in the output (default: false) */
  keepDirective?: true;
  /* change sed delimiter (default: '/') */
  delimiter?: string;
  /* escape sed (default: true) */
  escape?: false;
  /* the acutal comment directive identifier (default: '###[IF]') */
  identifier?: string;
type CommentOptionsR = {
  [K in keyof CommentOptions]-?: CommentOptions[K];
};

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

export type Directive<A = Actions> = {
  key: string;
  value: string | number | boolean;
  ifTrue: A | null;
  ifFalse: A | null;
};

type ReDirective = {
  dir: RegExp;
  scar: RegExp;
  scdr: RegExp | null;
  mcar: RegExp;
  mcdr: RegExp;
};


// -----------------------------------------------------------------------------
// @id::helpers
// -----------------------------------------------------------------------------

/**
 * action get with type in-tack
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
 * helper to create regex from string or return existing regex
 * @param  {RegExp | string} pattern
 * @return {RegExp}
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
 * helper to create regex from string or return existing regex
 * @param  {RegExp | string} pattern
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
export const createDirectiveRegex = /* @__PURE__ */ (() => {
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
    const start = typeof singleStart === 'string'
      ? toEscapedPattern(singleStart, escape)
      : singleStart?.source;
    const end = typeof singleEnd === 'string'
      ? toEscapedPattern(singleEnd, escape)
      : singleEnd?.source;

    const id = toEscapedPattern(options.identifier);
    cache = {
      scar: toRegex(singleStart, escape), // single start
      scdr: singleEnd ? toRegex(singleEnd, escape) : null, // single end
      mcar: toRegex(options.multi[0], escape), // multi start
      mcdr: toRegex(options.multi[1], escape), // multi end
      dir: !end
        ? new RegExp(`${start}\\s*${id}(.+)$`)
        : new RegExp(`${start}\\s*${id}(.+?)\\s*?${end}\\s*?$`),
    };
    return cache;
  };
})();


// -----------------------------------------------------------------------------
// @id::parser(s)
// -----------------------------------------------------------------------------

/**
 * <N>Line parser
 * @param  {string} param
 * @param  {number} [def=1]
 * @return {count: number; param: string;}
 */
export const parseLineCount = (param: string, def = 1): {count: number; param: string;} => {
  const lineMatch = param.match(/(\d+)L$/);
  let count = def;
  if (lineMatch?.[1]) {
    count = Number.parseInt(lineMatch[1]);
    param = param.slice(0, -lineMatch[0].length);
  }
  return {count, param};
};


/**
 * action directive  parser
 * @param  {string} spec
 * @param  {CommentOptionsR} options
 * @return {Actions | null}
 */
export const parseAction = /* @__PURE__ */ (() => {
  // strict equality cache based on options - option Map/WeakMap not worth overhead
  const cache = new Map<string, Actions | null>();
  let lastOptions: CommentOptionsR | null = null;
  return (spec: string, options: CommentOptionsR): Actions | null => {
    // clear cache if options changed
    if (lastOptions !== options) {
      cache.clear();
      lastOptions = options;
    }
    // check cache
    if (cache.has(spec)) { return cache.get(spec)!; }

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
      cache.set(spec, result);
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
      cache.set(spec, result);
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
      cache.set(spec, result);
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
      if (typeof pattern !== 'string' || typeof replacement !== 'string') {
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
      cache.set(spec, result);
      return result;
    }

    console.error(`[commentDirective:parseAction] unknown action: ${spec}`);
    return null;
  };
})();


/**
 * parse directive line or null
 * @param  {null | string[]} parts       - directive parts
 * @param  {string} line                 - line - used to report errors
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
 * apply/processes a directive at lines[i], mutates out, and returns the new index i
 * @param  {string[]} lines              - lines to process
 * @param  {number} i                    - current index
 * @param  {Directive} dir               - directive to process
 * @param  {FlagStruc} flags             - flags to test directive against
 * @param  {string[]} out                - output -> mutates
 * @param  {CommentOptionsR} options - comment format type
 * @return {number}                      - new index
 */
const applyDirective = (
  i: number,
  action: Actions | null,
  out: string[],
  lines: string[],
  options: CommentOptionsR,
  addStack: ([idx, line]: [idx: number, line: string])=> void,
): number => {
  // rm the next - count lines
  if (action?.type === ACT_MAP.rml) { return i + action.count; }
  // regex/match helpers
  const re = createDirectiveRegex(options);

  // if no action or action condition is not met
  if (!action) {
    const currentLine = lines[i] ?? '';
    // always drop the directive comment itself
    if (currentLine && re.dir.test(currentLine)) {
      addStack([i - 1, currentLine]);
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
      out.push(currentLine.replace(rePatt, replacement));
      j++;
      processedLines++;
      // stop break
      if (reStop && currentLine.match(reStop)) { break; }
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
  if (!currentLine || !currentLine.trim().length) { return j; }
  // unless explict false, adjust white space
  const spaceAdjust = options.spaceAdjust !== false;
  // rm/trim end space(s)
  const spaceTrim = (val: string) => (spaceAdjust ? val.replace(/\s+$/, '') : val);

  // check for single-line comment
  const singleStartMatch = currentLine.match(re.scar);
  if (singleStartMatch) {
    const singleStartIndex = currentLine.search(re.scar);
    let beforeComment = currentLine.slice(0, singleStartIndex);
    // account for white space before comment
    if (spaceAdjust) {
      beforeComment = ' '.repeat(Math.max(0, currentLine.length - currentLine.trimStart().length))
        + beforeComment;
    }

    // single-line comment with end marker (like HTML <!-- -->)
    if (re.scdr) {
      beforeComment = currentLine.slice(0, singleStartIndex);
      const singleEndIndex = currentLine.search(re.scdr);
      if (singleEndIndex > singleStartIndex) {
        const commentStartLength = singleStartMatch[0].length;
        const singleEndMatch = currentLine.slice(singleEndIndex).match(re.scdr);
        const commentEndLength = singleEndMatch ? singleEndMatch[0].length : 0;
        const commentContent = currentLine.slice(
          singleStartIndex + commentStartLength,
          singleEndIndex,
        );
        const afterComment = currentLine.slice(singleEndIndex + commentEndLength);
        if (isUncomment) {
          // add adjusted white space if empty space
          beforeComment = currentLine.slice(0, singleStartIndex);
          if (spaceAdjust && !beforeComment.trim().length) {
            beforeComment = beforeComment + ' '.repeat(commentStartLength);
          }
          out.push(spaceTrim(`${beforeComment}${commentContent}${afterComment}`));
          return j;
        }
        const resultLine = `${beforeComment}${afterComment}`;
        resultLine.trim().length > 0 && out.push(resultLine);
        return j;
      }
    }

    // single-line comment without end marker (like // or #)
    if (!re.scdr) {
      const commentStartLength = singleStartMatch[0].length;
      const commentContent = currentLine.slice(singleStartIndex + commentStartLength);
      if (isUncomment) {
        out.push(spaceTrim(`${beforeComment}${commentContent}`));
        return j;
      }
      beforeComment.trim().length > 0 && out.push(beforeComment);
      return j;
    }
  }

  // check if start/end patterns equal -> like python ('''|""")
  const sameStartEnd = re.mcar.source === re.mcdr.source;
  const scar = currentLine.search(re.mcar);
  let scdr = -1;
  if (scar !== -1) {
    // for same start/end patterns, find the next occurrence after the start
    if (sameStartEnd) {
      const nextMatch = currentLine.slice(scar + 1).search(re.mcdr);
      if (nextMatch !== -1) {
        scdr = scar + 1 + nextMatch;
      }
    } else {
      // different start/end patterns
      scdr = currentLine.search(re.mcdr);
    }
  }

  // if single-line multi-line comment case
  if (scar !== -1 && scdr !== -1 && scdr > scar) {
    // get the actual matched comment markers to know their length
    const commentStartMatch = currentLine.slice(scar).match(re.mcar);
    const commentEndMatch = currentLine.slice(scdr).match(re.mcdr);
    const commentStartLength = commentStartMatch ? commentStartMatch[0].length : 3;
    const commentEndLength = commentEndMatch ? commentEndMatch[0].length : 3;

    let beforeComment = currentLine.slice(0, scar);
    const commentContent = currentLine.slice(scar + commentStartLength, scdr);
    const afterComment = currentLine.slice(scdr + commentEndLength);

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
    resultLine.trim().length > 0 && out.push(resultLine);
    return j;
  }
  // multi-line comment
  const commentLines: string[] = [];
  let inComment = false;
  let beforeComment = '';
  let afterComment = '';
  let commentStartLength = 3; // default fallback
  let commentStartDiff = 0; // for whitespace adj
  let commentEndLength = 3; // default fallback
  let commentEndDiff = 0; // for whitespace adj
  while (j < lines.length) {
    currentLine = lines[j];
    if (!currentLine) { j++; continue; }

    const mcar = currentLine.search(re.mcar);
    if (!inComment && mcar !== -1) {
      inComment = true;
      beforeComment = currentLine.slice(0, mcar);
      const commentStartMatch = currentLine.slice(mcar).match(re.mcar);
      commentStartLength = commentStartMatch ? commentStartMatch[0].length : 3;
      commentStartDiff = commentStartMatch
        ? commentStartMatch[0].length - commentStartMatch[0].trimStart().length
        : 0;
      const afterStart = currentLine.slice(mcar + commentStartLength);

      // check for end marker on the same line (but after the start)
      let mcdr = -1;
      if (sameStartEnd) {
        // if same start/end patterns -> find next occurrence
        mcdr = afterStart.search(re.mcdr);
        // adjust to absolute position
        if (mcdr !== -1) { mcdr = mcar + commentStartLength + mcdr; }
      } else {
        mcdr = currentLine.search(re.mcdr);
        // make sure end comes after start
        if (mcdr !== -1 && mcdr <= mcar) { mcdr = -1; }
      }

      // comment ends on the same line
      if (mcdr !== -1) {
        const commentEndMatch = currentLine.slice(mcdr).match(re.mcdr);
        commentEndLength = commentEndMatch ? commentEndMatch[0].length : 3;
        commentEndDiff = commentEndMatch
          ? commentEndMatch[0].length - commentEndMatch[0].trimEnd().length
          : 0;
        commentLines.push(currentLine.slice(mcar + commentStartLength, mcdr));
        afterComment = currentLine.slice(mcdr + commentEndLength);
        j++;
        break;
      }
      commentLines.push(afterStart);
      j++;
      continue;
    }
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
      const uncommentedContent = commentLines.join('\n');
      // add adjusted white space if empty space
      if (spaceAdjust && !beforeComment.trim().length) {
        beforeComment = beforeComment + ' '.repeat(commentStartDiff);
        afterComment = ' '.repeat(commentEndDiff) + afterComment;
      }
      const resultLine = `${beforeComment}${uncommentedContent}${afterComment}`;
      if (resultLine.includes('\n')) {
        // multi-line case
        resultLine.split('\n').forEach(line => out.push(spaceTrim(line)));
        return j - 1;
      }
      out.push(spaceTrim(resultLine));
      return j - 1;
    }
    // remove comment: in comment
    const resultLine = `${beforeComment}${afterComment}`;
    resultLine.trim().length > 0 && out.push(resultLine);
    return j - 1;
  } else if (currentLine && re.scar.test(currentLine)) {
    // remove comment: only if in comment of next line is single-line comment
    const resultLine = `${beforeComment}${afterComment}`;
    resultLine.trim().length > 0 && out.push(resultLine);
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
  const cstack: [number, string][] = [];
  const out: string[] = [];
  let tmplLast: string | null = null;
  let tmplCur = tmpl;
  let iquitAt = 0;
  let doffset = 0; // directive offset
  const dkeep = optionsP?.keepDirective; // keep directives

  // rather than object.assign we set props to better cache createDirectiveRegex
  const options = (optionsP ?? DEFAULT_OPTIONS) as CommentOptions;
  if (!options.delimiter) { options.delimiter = DEFAULT_OPTIONS.delimiter; }
  // default js comment format
  if (!options.single) { options.single = DEFAULT_OPTIONS.single; }
  if (!options.multi) { options.multi = DEFAULT_OPTIONS.multi; }
  // directive identifier
  const identifier = options?.identifier ?? DEFAULT_OPTIONS.identifier;
  if (!options.identifier) { options.identifier = identifier; }

  const dkeep = options?.keepDirective; // keep directives
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

  // determines line offset, required for position if/when lines are removed (a headache)
  const addStack = ([idx, line]: [idx: number, line: string]) => {
    // if not keeping comments we can ignore all stack/logic
    if (!dkeep) { return; }
    // check if the prvious cmt removed lines and offset the insert idx
    const prv = cstack[cstack.length - 1];
    const action = prv
      ? getAction(parseDirective(splitDirectiveLine(prv[1]), prv[1], options), flags)
      : null;
    if (action?.type === ACT_MAP.rml) { doffset = doffset + action.count; }
    // ensure we never push a line idx lower than last; as this can/is called recursivly
    idx = idx - doffset;
    idx >= (prv?.[0] ?? 0) && cstack.push([idx, line]);
  };

  let iglobal = 0;
  // while & break iterative loop
  while (true) {
    // 10000 loop limit - could happen with a bad user sed directive
    // eslint-disable-next-line @stylistic/max-len
    if (iquitAt > 1e4) { throw new Error(`[commentDirective] 10,000-loop limit was hit, either a recursive loop or an absurd use-case; instead of going to infinity and beyond, bailing...`); }
    iquitAt++;

    // keep loop'ing till stable -> no comment directives left that make changes
    if (tmplCur === tmplLast) { break; }
    tmplLast = tmplCur;

    const lines: string[] = tmplCur.split(/\r?\n/);
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
      const post: string[] = action.count ? target.slice(action.count) : [];
      target = action.count ? target.slice(0, action.count) : target;

      const replaced = target.join('\n').replace(
        new RegExp(
          toEscapedPattern(action.pattern, options.escape),
          action.flags.join(''),
        ),
        action.replacement,
      );

      // if diff exit for-loop & restart the main while loop
      const results = [pre, line, replaced].concat(post).join('\n');
      if (tmplLast !== results) {
        tmplCur = results;
        passChanged = true;
        break;
      }
    }

    // if global sed was applied, restart the main loop
    if (passChanged) { continue; }
    // prevent re-run of global loop
    iglobal = lines.length + 1;
    // reset as new loop
    out.length = 0;
    doffset = 0;

    // non-global sed main/loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const parts = splitDirectiveLine(line);
      const dir = parseDirective(parts, line, options);
      if (!dir) {
        out.push(line);
        continue;
      }

      // skip sed global; only happen if keeping directive
      if (isSedDirectiveG(dir)) {
        dkeep && out.push(line);
        continue;
      }
      const action = getAction(dir, flags);

      let iadd = i;
      dkeep && addStack([iadd, line]);
      // this while loop handles 'stacked' comment directives by pushing them
      // back into 'out' evaluate next time around, again, and again
      let nxtLine = lines[i + 1] ?? '';
      while (nxtLine?.length && reDirective.test(nxtLine)) {
        out.push(nxtLine);
        ++iadd;
        dkeep && addStack([i + 1, lines[i + 1] ?? '']);
        ++i;
        nxtLine = lines[i + 1] ?? '';
      }

      const iprv = i;
      const iout = out.length;
      // @todo: remove this mutation/pass-around-logic
      i = applyDirective(i, action, out, lines, options, addStack);
      // since rm'ing a comment doesn't always remove a line this calculates diff
      if (action?.type === ACT_MAP.rmc) {
        doffset = doffset + ((i - iprv) - (out.length - iout));
      }
    }

    tmplCur = out.join('\n');
  }

  // rtn or re-insert comments
  if (!dkeep) { return tmplCur; }
  const tmplFin = tmplCur.split(/\r?\n/);
  const fout: string[] = [];
  for (const item of tmplFin) {
    while (cstack?.[0]?.[0] === fout.length) {
      const insert = cstack.shift();
      insert && fout.push(insert[1]);
    }
    fout.push(item ?? '');
  }
  // last lines
  while (cstack.length > 0) {
    const insert = cstack.shift();
    insert && fout.push(insert[1]);
  }

  return fout.join('\n');
};

export default commentDirective;
