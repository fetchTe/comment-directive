// -----------------------------------------------------------------------------
// @id::constants
// -----------------------------------------------------------------------------
const AKEYS = {
  rmLine: 'removeLines',
  rmCom: 'removeComment',
  unCom: 'uncomment',
  sed: 'sed',
} as const;

const APREFIXS = ['rm', 'un', 'sed'] as const;


// -----------------------------------------------------------------------------
// @id::types
// -----------------------------------------------------------------------------
export type CommentFormat = {
  single: [start: RegExp | string, end?: null | RegExp | string];
  multi: [start: RegExp | string, end: RegExp | string];
  /* disable white-space logic when removing/uncommenting (default: true) */
  spaceAdjust?: false;
  /* keep retain directive comments in the output (default: false) */
  commentKeep?: true;
  /* change sed delimiter (default: '/') */
  delimiter?: string;
  /* escape sed (default: true) */
  escape?: false;
};

export type FlagStruc = Record<string, boolean | number | string>;

export type AKeys = typeof AKEYS;

export type ActionRemoveLines = { type: AKeys['rmLine']; count: number; };

export type ActionRemoveComment = { type: AKeys['rmCom']; count: number; };

export type ActionUnComment = { type: AKeys['unCom']; count: number; };

export type ActionSedReplace = {
  type: AKeys['sed'];
  pattern: string;
  replacement: string;
  flags: string[];
  count: number;
  stop: null | string;
};

export type Actions = ActionRemoveLines | ActionRemoveComment | ActionUnComment | ActionSedReplace;

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
const getAction = <A extends Actions>(dir: Directive<A>, flags: FlagStruc): A | null => {
  const flagVal = flags[dir.key];
  const conditionMet = flagVal === dir.value
    || String(flagVal) === String(dir.value);
  return conditionMet ? dir.ifTrue : dir.ifFalse;
};


/**
 * type gaurd for sed action
 * @param  {Directive | null} dir
 * @return {dir is Directive<ActionSedReplace>}
 */
const isSedDirective = (dir: Directive | null): dir is Directive<ActionSedReplace> =>
  dir?.ifTrue?.type === AKEYS.sed || dir?.ifFalse?.type === AKEYS.sed;


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


// simple ref eq tuple cache for createDirectiveRegex since its somewhat expensive
let DIRECTIVE_RECAHCE: [CommentFormat | null, ReDirective | null] = [null, null];

/**
 * create the regex directive pattern to match against
 * @cached - saves us the trouble of re-initing & passing around a complex regex object
 * @param  {CommentFormat} commentFormat
 * @return {ReDirective}
 */
const createDirectiveRegex = (commentFormat: CommentFormat): ReDirective => {
  const directiveRegex = DIRECTIVE_RECAHCE[0] === commentFormat && DIRECTIVE_RECAHCE[1]
    ? DIRECTIVE_RECAHCE[1]
    : null;
  if (directiveRegex) { return directiveRegex; }
  const [singleStart, singleEnd] = commentFormat.single;

  const reDir: ReDirective = {
    dir: /$/, // so ts won't complain
    scar: toRegex(singleStart), // single start
    scdr: singleEnd ? toRegex(singleEnd) : null, // single end
    mcar: toRegex(commentFormat.multi[0]), // multi start
    mcdr: toRegex(commentFormat.multi[1]), // multi end
  };

  if (singleStart instanceof RegExp) {
    const startPattern = singleStart.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    if (singleEnd) {
      const endPattern = singleEnd instanceof RegExp
        ? singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '')
        : toEscapedPattern(singleEnd);
      reDir.dir = new RegExp(`^\\s*${startPattern}\\s*##+\\[IF\\]\\s*(.+?)\\s*${endPattern}\\s*$`);
      DIRECTIVE_RECAHCE = [commentFormat, reDir];
      return reDir;
    }
    reDir.dir = new RegExp(`^\\s*${startPattern}\\s*##+\\[IF\\]\\s*(.+)$`);
    DIRECTIVE_RECAHCE = [commentFormat, reDir];
    return reDir;
  }

  const escapedStart = toEscapedPattern(singleStart);
  if (singleEnd) {
    const escapedEnd = typeof singleEnd === 'string'
      ? toEscapedPattern(singleEnd)
      : singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    reDir.dir = new RegExp(`^\\s*${escapedStart}\\s*##+\\[IF\\]\\s*(.+?)\\s*${escapedEnd}\\s*$`);
    DIRECTIVE_RECAHCE = [commentFormat, reDir];
    return reDir;
  }
  reDir.dir = new RegExp(`^\\s*${escapedStart}\\s*##+\\[IF\\]\\s*(.+)$`);
  DIRECTIVE_RECAHCE = [commentFormat, reDir];
  return reDir;
};


// -----------------------------------------------------------------------------
// @id::parser(s)
// -----------------------------------------------------------------------------

/**
 * action directive  parser
 * @param  {string} spec
 * @param  {CommentFormat} commentFormat
 * @return {Actions | null}
 */
const parseAction = (spec: string, commentFormat: CommentFormat): Actions | null => {
  let split: null | [string, string] = null;
  for (const item of APREFIXS) {
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
    : 1;

  // remove X lines
  if (act === 'rm' && (param.startsWith('line') || (/^\d+L$/).test(param))) {
    return { type: AKEYS.rmLine, count };
  }

  // comment
  if (param.startsWith('comment')) {
    // @note -> cound is passed, but not implemented, probs not worth effort/overhead
    if (act === 'rm') { return { type: AKEYS.rmCom, count }; }
    if (act === 'un') { return { type: AKEYS.unCom, count }; }
  }

  // match sed pattern like /pattern/replacement/[flags][lineCount]
  if (act === 'sed') {
    const delimiter = commentFormat?.delimiter ?? '/';
    // create regex pattern using the custom delimiter
    const escapedDelimiter = toEscapedPattern(delimiter);
    const reEnd = `([gimuys]*)(@(?<stop>(.*)))?(?<lines>\\d*L)?$`;
    // eslint-disable-next-line @stylistic/function-paren-newline
    const sedRegex = new RegExp(
      `^${escapedDelimiter}(.*?)${escapedDelimiter}(.*?)${escapedDelimiter}${reEnd}`);
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

    return {
      type: AKEYS.sed,
      pattern,
      replacement,
      flags: (flags ?? '').split(''), // regex flags
      count,
      stop,
    };
  }
  console.error(`[commentDirective:parseAction] unknown action: ${spec}`);
  return null;
};


/**
 * parse directive line or null
 * @param  {null | string[]} parts       - directive parts
 * @param  {string} line                 - line - used to report errors
 * @param  {CommentFormat} commentFormat - comment format
 * @return {Directive | null}
 */
const parseDirective = (
  parts: null | string[],
  line: string,
  commentFormat: CommentFormat,
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
    ifTrue: parseAction(ifTrue, commentFormat),
    ifFalse: ifFalse ? parseAction(ifFalse, commentFormat) : null,
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
 * @param  {CommentFormat} commentFormat - comment format type
 * @return {number}                      - new index
 */
const applyDirective = (
  i: number,
  action: Actions | null,
  out: string[],
  lines: string[],
  commentFormat: CommentFormat,
  addStack: ([idx, line]: [idx: number, line: string])=> void,
): number => {
  // rm the next - count lines
  if (action?.type === AKEYS.rmLine) { return i + action.count; }
  const re = createDirectiveRegex(commentFormat);

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
  if (action.type === AKEYS.sed) {
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
        new RegExp(toEscapedPattern(pattern), flags.length ? flags.join('') : undefined),
        replacement,
      );
      out.push(nxt);
      j++;
      processedLines++;
      if (stop && currentLine.match(new RegExp(toEscapedPattern(stop)))) {
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
  const isUncomment = action.type === AKEYS.unCom;
  const isRmcomment = action.type === AKEYS.rmCom;
  // return if not rm/un comment as this is a fall-through case (should never happen)
  if (!isRmcomment && !isUncomment) { return i; }

  let currentLine = lines[j];
  // since un/rm comment doesn't implment count we can simply ingore empty lines
  if (!currentLine || !currentLine.trim().length) { return j; }
  // unless explict false, adjust white space
  const spaceAdjust = commentFormat.spaceAdjust !== false;

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
 * @param  {[CommentFormat]} commentFormat - directive comment format - default js
 * @param  {string | null} [_last=null]    - internal/ used for recursive logic
 * @param  {[number, string][]} _cstack    - internal/ tracks cmt directive re-insert loc
 * @param  {number} [_iglobal=-1]          - internal/ tracks global sed 'i' line
 * @param  {number} [_iquitAt=0]           - internal/ prevents infinity loop
 * @return {string}

 */
export const commentDirective = (
  tmpl: string,
  flags: FlagStruc,
  // default js comment format
  commentFormatP: Partial<CommentFormat> = {},
  _last: null | string = null,
  _cstack: [number, string][] = [],
  _iglobal = -1,
  _iquitAt = 0,
): string => {
  // if we hit 10,000 loop (which should never happen, but could) we bail
  ++_iquitAt;
  if (_iquitAt > 1e4) {
    throw new Error([
      `[commentDirective] 10,000-loop limit was hit, either a recursive loop or`,
      `an absurd use-case; instead of going to infinity and beyond, bailing...`,
    ].join(' '));
  }
  const lines = tmpl.split(/\r?\n/);
  const out: string[] = [];
  const commentFormat = commentFormatP as CommentFormat;
  // rather than object.assign we set props to better cache createDirectiveRegex
  if (!commentFormat.delimiter) { commentFormat.delimiter = '/'; }
  // if (commentFormat.spaceAdjust !== false) { commentFormat.spaceAdjust = true; }
  if (!commentFormat.single) { commentFormat.single = [/^\s*\/\/\s*/, null]; }
  if (!commentFormat.multi) { commentFormat.multi = [/\s*\/\*/, /\*\//]; }

  const ckeep = commentFormat.commentKeep;
  const directiveRegex = createDirectiveRegex(commentFormat);

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null => {
    let match = Array.from(line.match(directiveRegex.dir) ?? [])?.[1];
    // let match = 'env=prod;sed=##aa;##//##mu'
    if (!match) { return null; }
    match = match.replace(/;$/, ''); // rm trailing ;
    const rems = Array.from(match.matchAll(new RegExp(`;(${APREFIXS.join('|')})`, 'g')));
    const result: string[] = [];
    let lastIndex = 0;
    for (const rem of rems) {
      const index = rem.index;
      // add the substring from the last index to the current index
      if (index > lastIndex) {
        result.push(match.substring(lastIndex, index));
      }
      lastIndex = index;
    }
    // add the remaining part of the string after the last index
    lastIndex < match.length && result.push(match.substring(lastIndex));
    // must have an action and at least one condition
    if (1 > result.length) { return null; }
    // rm leading ; in conds like ;un=comment
    return result.map(v => v.replace(/^;/, ''));
  };

  // determines line offset, required for position if/when lines are removed (a recursive headache)
  let offsetStack = 0;
  const addStack = ([idx, line]: [idx: number, line: string]) => {
    // if not keeping comments we can ignore all stack/logic
    if (!ckeep) { return; }
    // check if the prvious cmt removed lines and offset the insert idx
    const prv = _cstack[_cstack.length - 1];
    const dir = prv
      ? parseDirective(splitDirectiveLine(prv[1]), prv[1], commentFormat)
      : null;
    if (dir) {
      const action = getAction(dir, flags);
      if (action?.type === AKEYS.rmLine) {
        offsetStack = offsetStack + action.count;
      }
    }
    // ensure we never push a line idx lower than last; as this can/is called recursivly
    idx = idx - offsetStack;
    idx >= (prv?.[0] ?? 0) && _cstack.push([idx, line]);
  };

  // global sed loop(s)
  if (_iglobal) {
    for (let i = (0 > _iglobal ? 0 : _iglobal); i < lines.length; i++) {
      const line = lines[i] as string;
      const parts = splitDirectiveLine(line);
      if (!parts) { continue; }
      const dir = parseDirective(parts, line, commentFormat);
      if (isSedDirectiveG(dir)) {
        const action = getAction(dir, flags);
        if (!action) { continue; }
        ckeep && _cstack.push([i, line]);
        // global regex, clear, replace, re-add
        const results = [
          lines.slice(0, i).join('\n'), // pre-line
          line,
          // post-line
          lines.slice(i + 1).join('\n').replace(
            new RegExp(toEscapedPattern(action.pattern), action.flags.join('')),
            action.replacement,
          ),
        ].join('\n');

        if (_last === results) { continue; }
        return commentDirective(results, flags, commentFormat, results, _cstack, i + 1, _iquitAt);
      }
    }

    // re-add global sed directive now that they have been processed
    for (const [idx, line] of _cstack.reverse()) {
      lines[idx] = line;
    }
    _cstack.length = 0;
  }

  // non-global sed loop(s)
  // @todo: remove this mutation/pass-around-logic
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const parts = splitDirectiveLine(line);
    const dir = parseDirective(parts, line, commentFormat);
    if (!dir) {
      out.push(line);
      continue;
    }

    // skip sed global (should never happen - as global sed should be processed)
    if (isSedDirectiveG(dir)) {
      ckeep && _cstack.push([out.length, line]);
      continue;
    }
    const action = getAction(dir, flags);

    let iadd = i;
    ckeep && addStack([iadd, line]);
    // this while loop handles 'stacked' comment directives by pusing them
    // back into 'out', to recursively evaluate, next time around, again, and again
    while (directiveRegex.dir.test(lines[i + 1] ?? '')) {
      out.push(lines[i + 1] ?? '');
      ++iadd;
      ckeep && addStack([i + 1, lines[i + 1] ?? '']);
      ++i;
    }

    const iprv = i;
    const iout = out.length;
    i = applyDirective(i, action, out, lines, commentFormat, addStack);

    // since rm'ing a comment doesn't always remove a line this calculates diff
    if (action?.type === AKEYS.rmCom) {
      offsetStack = offsetStack + ((i - iprv) - (out.length - iout));
    }
  }

  const results = out.join('\n');
  // keep recur'ing till no changes -> no comment directives left that make changes
  if (_last !== results) {
    return commentDirective(results, flags, commentFormat, results, _cstack, 0, _iquitAt);
  }

  // not keeping comments
  if (!ckeep) { return results; }

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
