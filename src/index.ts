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
const PREFIXES = ['rm', 'un', 'sed', ...ACT_SEQ_ARR] as const;
const PREFIXES_RE = new RegExp(`;(${PREFIXES.join('|')})`, 'g');

// -----------------------------------------------------------------------------
// @id::types
// -----------------------------------------------------------------------------
export type Options = {
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
 * @param  {Options} options
 * @return {ReDirective}
 */
export const createDirectiveRegex = /* @__PURE__ */ (() => {
  // strict equality cache based on options - option Map/WeakMap not worth overhead
  let cache: ReDirective | null = null;
  let lastOptions: Options | null = null;
  return (options: Options): ReDirective => {
    // clear cache if options changed
    if (lastOptions !== options) {
      cache = null;
      lastOptions = options;
    }
    // check cache
    if (cache) { return cache; }
    const [singleStart, singleEnd] = options.single;
    const escape = options.escape;

    cache = {
      dir: /$/, // so ts won't complain
      scar: toRegex(singleStart, escape), // single start
      scdr: singleEnd ? toRegex(singleEnd, escape) : null, // single end
      mcar: toRegex(options.multi[0], escape), // multi start
      mcdr: toRegex(options.multi[1], escape), // multi end
    };

    if (singleStart instanceof RegExp) {
      const startPattern = singleStart.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
      if (!singleEnd) {
        cache.dir = new RegExp(`^\\s*${startPattern}\\s*###\\[IF\\](.+)$`);
        return cache;
      }
      const endPattern = singleEnd instanceof RegExp
        ? singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '')
        : toEscapedPattern(singleEnd, escape);
      // eslint-disable-next-line @stylistic/max-len
      cache.dir = new RegExp(`^\\s*${startPattern}\\s*###\\[IF\\](.+?)\\s*${endPattern}\\s*$`);
      return cache;
    }

    const escapedStart = toEscapedPattern(singleStart, escape);
    if (!singleEnd) {
      cache.dir = new RegExp(`^\\s*${escapedStart}\\s*###\\[IF\\](.+)$`);
      return cache;
    }
    const escapedEnd = typeof singleEnd === 'string'
      ? toEscapedPattern(singleEnd, escape)
      : singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    cache.dir = new RegExp(`^\\s*${escapedStart}\\s*###\\[IF\\](.+?)\\s*${escapedEnd}\\s*$`);
    return cache;
  };
})();


// -----------------------------------------------------------------------------
// @id::parser(s)
// -----------------------------------------------------------------------------

/**
 * action directive  parser
 * @param  {string} spec
 * @param  {Options} options
 * @return {Actions | null}
 */
export const parseAction = /* @__PURE__ */ (() => {
  // strict equality cache based on options - option Map/WeakMap not worth overhead
  const cache = new Map<string, Actions | null>();
  let lastOptions: Options | null = null;
  return (spec: string, options: Options): Actions | null => {
    // clear cache if options changed
    if (lastOptions !== options) {
      cache.clear();
      lastOptions = options;
    }
    // check cache
    if (cache.has(spec)) { return cache.get(spec)!; }

    let split: null | [string, string] = null;
    for (const item of PREFIXES) {
      const iact = `${item}=`;
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
    // line count if present -> 2L
    const lineCountMatch = param.match(/(\d+)L$/);
    const count = lineCountMatch?.[1]
      ? Number.parseInt(lineCountMatch[1])
      : (act === 'sed' ? 0 : 1);

    // remove X lines
    if (act === 'rm' && (param.startsWith('line') || (/^\d+L$/).test(param))) {
      const result = { type: ACT_MAP.rml, count };
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
      // @note -> cound is passed, but not implemented, probs not worth effort/overhead
      const result = { type: atype, count };
      cache.set(spec, result);
      return result;
    }

    // append/prepend/shift/pop
    if (isSeqActionType(act)) {
      // create regex pattern using the custom delimiter
      const escapedDelimiter = toEscapedPattern(options?.delimiter ?? '/', options.escape);
      const meta = `(@(?<stop>(.*)))?(?<lines>\\d*L)?$`;
      const endRegex = new RegExp(`^(?<val>(.*?))(${escapedDelimiter}(${meta}))?$`);
      const endMatch = param.match(endRegex);
      const val = endMatch?.groups?.['val'] ?? null;
      if (!val) {
        console.error(`[commentDirective:parseAction] no ${act} 'value' match found: ${param}`);
        return null;
      }
      const stop = endMatch?.groups?.['stop'] ?? null;
      const lines = endMatch?.groups?.['lines'] ?? null;
      const result = {
        val,
        type: ACT_MAP[act as ActsSeq],
        count: count ?? (Number.isInteger(lines) ? Number(lines) : null),
        stop,
      };
      cache.set(spec, result);
      return result;
    }

    // match sed pattern like /pattern/replacement/[flags][lineCount]
    if (act === 'sed') {
      const delimiter = options?.delimiter ?? '/';
      // create regex pattern using the custom delimiter
      const escapedDelimiter = toEscapedPattern(delimiter, options.escape);
      const meta = `([gimuys]*)(@(?<stop>(.*)))?(?<lines>\\d*L)?$`;
      // eslint-disable-next-line @stylistic/function-paren-newline
      const sedRegex = new RegExp(
        `^${escapedDelimiter}(.*?)${escapedDelimiter}(.*?)${escapedDelimiter}${meta}`);
      const sedMatch = param.match(sedRegex);
      if (!sedMatch) {
        console.error(`[commentDirective:parseAction] bad sed syntax: ${param}`);
        return null;
      }
      const [, pattern, replacement, flags] = sedMatch;
      if (typeof pattern !== 'string' || typeof replacement !== 'string') {
        console.error(`[commentDirective:parseAction] bad sed match: ${param}`);
        return null;
      }
      const stop = sedMatch?.groups?.['stop'] ?? null;

      const result = {
        type: ACT_MAP.sed,
        pattern,
        replacement,
        flags: (flags ?? '').split(''), // regex flags
        // if not global we re-set could to default 1
        count: !count && !flags?.includes('g') ? 1 : count,
        stop,
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
 * @param  {Options} options - comment format
 * @return {Directive | null}
 */
const parseDirective = (
  parts: null | string[],
  line: string,
  options: Options,
): Directive | null => {
  if (!parts) { return null; }
  const [condSpec, ifTrue, ifFalse] = parts;
  // condSpec is like "alt=1"
  const condMatch = condSpec?.match(/^([^=]+)=(.+)$/);
  if (!condMatch) {
    console.error(`[commentDirective:parseDirective] no/bad condition match: ${line}`);
    return null;
  }
  const [_match, key, val] = condMatch;
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
 * @param  {Options} options - comment format type
 * @return {number}                      - new index
 */
const applyDirective = (
  i: number,
  action: Actions | null,
  out: string[],
  lines: string[],
  options: Options,
  addStack: ([idx, line]: [idx: number, line: string])=> void,
): number => {
  // rm the next - count lines
  if (action?.type === ACT_MAP.rml) { return i + action.count; }
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
    let processedLines = 0;
    while (j < lines.length && (processedLines < count || stop)) {
      const currentLine = lines[j] ?? '';
      const nxt = currentLine.replace(
        new RegExp(toEscapedPattern(pattern, options.escape), flags.length
          ? flags.join('')
          : undefined),
        replacement,
      );
      out.push(nxt);
      j++;
      processedLines++;
      if (stop && currentLine.match(new RegExp(toEscapedPattern(stop, options.escape)))) {
        break;
      }

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
      if (stop && currentLine.match(new RegExp(toEscapedPattern(stop, options.escape)))) {
        break;
      }
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
          if (spaceAdjust && !beforeComment.trim().length) {
            beforeComment = beforeComment + ' '.repeat(commentStartLength);
          }
          out.push(`${beforeComment}${commentContent}${afterComment}`.replace(/\s+$/, ''));
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
        out.push(`${beforeComment}${commentContent}`.replace(/\s+$/, ''));
        // out.push(`${beforeComment}${commentContent}`);
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
      out.push(`${beforeComment}${commentContent}${afterComment}`.replace(/\s+$/, ''));
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
    if (!currentLine) {
      j++;
      continue;
    }

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
        resultLine.split('\n').forEach(line => out.push(line.replace(/\s+$/, '')));
        return j - 1;
      }
      out.push(resultLine.replace(/\s+$/, ''));
      return j - 1;
    } else {
      // remove comment: in comment
      const resultLine = `${beforeComment}${afterComment}`;
      resultLine.trim().length > 0 && out.push(resultLine);
      return j - 1;
    }
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
 * @param  {[Options]} options - directive comment format - default js
 * @param  {string | null} [_last=null]    - internal/ used for recursive logic
 * @param  {[number, string][]} _cstack    - internal/ tracks cmt directive re-insert loc
 * @param  {number} [_iglobal=-1]          - internal/ tracks global sed 'i' line
 * @param  {number} [_iquitAt=0]           - internal/ prevents infinity loop
 * @return {string}
 */
export const commentDirective = (
  tmpl: string,
  flags: FlagStruc,
  optionsP: Partial<Options> = {},
  _last: null | string = null,
  _cstack: [number, string][] = [],
  _iglobal = 0,
  _iquitAt = 0,
): string => {
  // if we hit 10,000 loop (should never happen, but could if bad user sed directive) we bail
  ++_iquitAt;
  if (_iquitAt > 1e4) {
    throw new Error([
      `[commentDirective] 10,000-loop limit was hit, either a recursive loop or`,
      `an absurd use-case; instead of going to infinity and beyond, bailing...`,
    ].join(' '));
  }
  const lines = tmpl.split(/\r?\n/);
  const out: string[] = [];
  const options = optionsP as Options;
  // rather than object.assign we set props to better cache createDirectiveRegex
  if (!options.delimiter) { options.delimiter = '/'; }
  // default js comment format
  if (!options.single) { options.single = [/^\s*\/\/\s*/, null]; }
  if (!options.multi) { options.multi = [/\s*\/\*/, /\*\//]; }

  const dkeep = options.keepDirective;
  const directiveRegex = createDirectiveRegex(options);

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null => {
    // much faster to do a indexOf check initially
    if (line.indexOf('###[IF]') === -1) { return null; }
    let match = directiveRegex.dir.exec(line)?.[1];
    if (!match) { return null; }
    PREFIXES_RE.lastIndex = 0; // reset regex
    // rm trailing ;
    if (match[match.length - 1] === ';') { match = match.slice(0, -1); }
    const result: string[] = [];
    let lastIndex = 0;
    for (const rem of match.matchAll(PREFIXES_RE)) {
      const index = rem.index;
      // add the substring from the last index to the current index
      index > lastIndex && result.push(match.substring(lastIndex, index));
      lastIndex = index;
    }
    // add the remaining part of the string after the last index
    lastIndex < match.length && result.push(match.substring(lastIndex));
    // must have an action and at least one condition
    if (1 > result.length) { return null; }
    // rm leading ; in conds like ;un=comment
    return result.map(v => (v[0] === ';' ? v.slice(1) : v));
  };

  // determines line offset, required for position if/when lines are removed (a recursive headache)
  let offsetStack = 0;
  const addStack = ([idx, line]: [idx: number, line: string]) => {
    // if not keeping comments we can ignore all stack/logic
    if (!dkeep) { return; }
    // check if the prvious cmt removed lines and offset the insert idx
    const prv = _cstack[_cstack.length - 1];
    const dir = prv
      ? parseDirective(splitDirectiveLine(prv[1]), prv[1], options)
      : null;
    if (dir) {
      const action = getAction(dir, flags);
      if (action?.type === ACT_MAP.rml) {
        offsetStack = offsetStack + action.count;
      }
    }
    // ensure we never push a line idx lower than last; as this can/is called recursivly
    idx = idx - offsetStack;
    idx >= (prv?.[0] ?? 0) && _cstack.push([idx, line]);
  };

  // global sed loop(s)
  for (let i = _iglobal; i < lines.length; i++) {
    const line = lines[i] as string;
    const parts = splitDirectiveLine(line);
    if (!parts) { continue; }
    const dir = parseDirective(parts, line, options);
    if (!isSedDirectiveG(dir)) { continue; }
    const action = getAction(dir, flags);
    if (!action) { continue; }
    let targ = lines.slice(i + 1);
    // limit to N lines
    const post: string[] = action.count ? targ.slice(action.count) : [];
    targ = action.count ? targ.slice(0, action.count) : targ;
    const results = [
      lines.slice(0, i).join('\n'), // pre-line
      line,
      // post-line
      targ.join('\n').replace(
        new RegExp(
          toEscapedPattern(action.pattern, options.escape),
          action.flags.join(''),
        ),
        action.replacement,
      ),
    ].concat(post).join('\n');
    if (_last === results) { continue; }
    return commentDirective(results, flags, options, results, _cstack, i + 1, _iquitAt);
  }
  _iglobal = lines.length;


  // non-global sed loop(s)
  // @todo: remove this mutation/pass-around-logic
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const parts = splitDirectiveLine(line);
    const dir = parseDirective(parts, line, options);
    if (!dir) {
      out.push(line);
      continue;
    }

    // skip sed global (should only happen if keeping directive)
    if (isSedDirectiveG(dir)) {
      dkeep && out.push(line);
      continue;
    }
    const action = getAction(dir, flags);

    let iadd = i;
    dkeep && addStack([iadd, line]);
    // this while loop handles 'stacked' comment directives by pusing them
    // back into 'out', to recursively evaluate, next time around, again, and again
    while (directiveRegex.dir.test(lines[i + 1] ?? '')) {
      out.push(lines[i + 1] ?? '');
      ++iadd;
      dkeep && addStack([i + 1, lines[i + 1] ?? '']);
      ++i;
    }

    const iprv = i;
    const iout = out.length;
    i = applyDirective(i, action, out, lines, options, addStack);

    // since rm'ing a comment doesn't always remove a line this calculates diff
    if (action?.type === ACT_MAP.rmc) {
      offsetStack = offsetStack + ((i - iprv) - (out.length - iout));
    }
  }

  const results = out.join('\n');
  // keep recur'ing till no changes -> no comment directives left that make changes
  if (_last !== results) {
    return commentDirective(results, flags, options, results, _cstack, 0, _iquitAt);
  }

  // not keeping comments
  if (!dkeep) { return results; }

  // re-insert comments
  const cout: string[] = [];
  // remove duplicates
  _cstack = Array.from(new Set(_cstack.map(v => JSON.stringify(v))))
    .map(v => JSON.parse(v)) as [number, string][];

  for (const item of out) {
    while (_cstack?.[0]?.[0] === cout.length) {
      const insert = _cstack.shift();
      insert && cout.push(insert[1]);
    }
    cout.push(item ?? '');
  }
  // last line
  const insert = _cstack.shift();
  insert && cout.push(insert[1]);
  return cout.join('\n');
};

export default commentDirective;
