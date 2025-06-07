export type CommentFormat = {
  single: [start: RegExp | string, end?: null | RegExp | string];
  multi: [start: RegExp | string, end: RegExp | string];
  delimiter?: string;
};


export type FlagStruc = Record<string, boolean | number | string>;

const ATYPE = {
  rmLine: 'removeLines',
  rmCom: 'removeComment',
  unCom: 'uncomment',
  sed: 'sed',
} as const;

type AType = typeof ATYPE;

export type ActionRemoveLines = { type: AType['rmLine']; count: number; };

export type ActionRemoveComment = { type: AType['rmCom']; };

export type ActionUnComment = { type: AType['unCom']; };

export type ActionSedReplace = {
  type: AType['sed'];
  pattern: string;
  replacement: string;
  flags: string[];
  lineCount: number;
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
  dir?.ifTrue?.type === ATYPE.sed || dir?.ifFalse?.type === ATYPE.sed;


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
const toEscapedPattern = (pattern: string): string => {
  try {
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
const toRegex = (pattern: RegExp | string): RegExp =>
  (pattern instanceof RegExp
    ? pattern
    : new RegExp(toEscapedPattern(pattern)));


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


/**
 * action directive  parser
 * @param  {string} spec
 * @param  {CommentFormat} commentFormat
 * @return {Actions | null}
 */
const parseAction = (spec: string, commentFormat: CommentFormat): Actions | null => {
  const [act, param] = spec.split('=').map(s => s.trim());
  if (param === undefined) {
    console.error(`[commentDirective:parseAction] bad/no action param: ${spec}`);
    return null;
  }
  if (act === 'rm') {
    if (param === 'comment') { return { type: ATYPE.rmCom }; }
    // remove X lines
    if ((/^\d+L$/).test(param)) {
      return { type: ATYPE.rmLine, count: parseInt(param.slice(0, -1), 10) };
    }
  }
  if (act === 'un' && param === 'comment') { return { type: ATYPE.unCom }; }
  // match sed pattern like /pattern/replacement/[flags][lineCount]
  if (act === 'sed') {
    const delimiter = commentFormat?.delimiter ?? '/';
    // create regex pattern using the custom delimiter
    const escapedDelimiter = toEscapedPattern(delimiter);
    // eslint-disable-next-line @stylistic/function-paren-newline
    const sedRegex = new RegExp(
      `^${escapedDelimiter}(.+?)${escapedDelimiter}(.+?)${escapedDelimiter}([gim]*)(?:\\d*L)?$`);
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
    // line count if present -> 2L
    const lineCountMatch = param.match(/(\d+)L$/);
    return {
      type: ATYPE.sed,
      pattern,
      replacement,
      flags: (flags ?? '').split(''), // regex flags
      lineCount: lineCountMatch?.[1]
        ? Number.parseInt(lineCountMatch[1])
        : 1,
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
): number => {
  // rm the next - count lines
  if (action?.type === ATYPE.rmLine) { return i + action.count; }

  const re = createDirectiveRegex(commentFormat);
  if (!action) {
    // always drop the directive comment itself
    if (lines[i] && re.dir.test(lines[i])) { return i; }
    // if no action or action condition is not met
    out.push(lines[i] ?? '');
    return i;
  }

  // sed'in -> line
  if (action.type === ATYPE.sed) {
    const {
      pattern, replacement, flags, lineCount,
    } = action;
    let j = i + 1;
    let processedLines = 0;
    while (j < lines.length && processedLines < lineCount) {
      const currentLine = lines[j];
      if (!currentLine) {
        out.push(currentLine ?? '');
        j++;
        continue;
      }
      /* @deprecate -> handled within main commentDirective loop
      // if comment directives, push into 'stack', to recursively runs till none left
      if (re.dir.test(currentLine)) {
        out.push(currentLine);
        ++j;
        continue;
      }
      */
      const nxt = currentLine.replace(
        new RegExp(toEscapedPattern(pattern), flags.length ? flags.join('') : undefined),
        replacement,
      );
      out.push(nxt);
      j++;
      processedLines++;
    }
    // copy remaining lines in the range without modification
    while (j < lines.length && processedLines < lineCount) {
      const currentLine = lines[j];
      out.push(currentLine ?? '');
      j++;
      processedLines++;
    }
    return j - 1;
  }

  const isUncomment = action.type === ATYPE.unCom;
  // return if not rm/un comment as this is a fall-through case (should never happen)
  if (ATYPE.rmCom !== action.type && !isUncomment) { return i; }

  let j = i + 1;
  let currentLine = lines[j];
  /* @deprecate -> handled within main commentDirective loop
  if (currentLine && re.dir.test(currentLine)) {
    out.push(currentLine);
    ++j;
    currentLine = lines[j];
  }
  */
  if (!currentLine) { return j; }


  // check for single-line comment
  const singleStartMatch = currentLine.match(re.scar);
  if (singleStartMatch) {
    const singleStartIndex = currentLine.search(re.scar);
    const beforeComment = currentLine.slice(0, singleStartIndex);

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

    const beforeComment = currentLine.slice(0, scar);
    const commentContent = currentLine.slice(scar + commentStartLength, scdr);
    const afterComment = currentLine.slice(scdr + commentEndLength);

    // uncomment: keep the content inside and rm markers
    if (isUncomment) {
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
  let commentEndLength = 3; // default fallback
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

  // uncomment: output the comment content and preserve surrounding
  if (inComment) {
    if (isUncomment) {
      // inComment
      const uncommentedContent = commentLines.join('\n');
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
 * @param  {[type]} [_lastOutput=tmpl]     - internal - used for recur
 * @return {string}
 */
export const commentDirective = (
  tmpl: string,
  flags: FlagStruc,
  // default js comment format
  commentFormatP: Partial<CommentFormat> = {},
  _lastOutput = tmpl,
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
  const commentFormat: CommentFormat = Object.assign({
    single: [/^\s*\/\/\s*/, null],
    multi: [/\s*\/\*/, /\*\//],
    delimiter: '/',
  }, commentFormatP);
  const directiveRegex = createDirectiveRegex(commentFormat);

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null =>
    Array.from(line.match(directiveRegex.dir) ?? [])?.[1]
      ?.split(';')
      ?.map(p => p.trim())
      ?.filter(Boolean) ?? null;

  // global sed's
  for (const line of lines) {
    const parts = splitDirectiveLine(line);
    if (!parts) { continue; }
    const dir = parseDirective(parts, line, commentFormat);
    if (isSedDirectiveG(dir)) {
      const action = getAction(dir, flags);
      if (!action) { continue; }
      // global regex, clear, replace, re-add
      const results = lines.join('\n').replace(
        new RegExp(toEscapedPattern(action.pattern), action.flags.join('')),
        action.replacement,
      );
      if (_lastOutput !== results) {
        return commentDirective(results, flags, commentFormat, results);
      }
    }
  }

  // loop the lines and apply directive
  // @todo: remove this mutation/pass-around-logic
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.length) {
      out.push(line ?? '');
      continue;
    }
    const dir = parseDirective(splitDirectiveLine(line), line, commentFormat);
    if (!dir) {
      out.push(line);
      continue;
    }
    // skip sed global (should never happen - as global sed should be processed)
    if (isSedDirectiveG(dir)) { continue; }
    const action = getAction(dir, flags);

    // if current line is a directive, push back into 'stack', to recursively re-eval
    while (directiveRegex.dir.test(lines[i + 1] ?? '')) {
      out.push(lines[i + 1] ?? '');
      ++i;
    }

    // apply directive -> advancin i as needed
    i = applyDirective(i, action, out, lines, commentFormat);
  }

  const results = out.join('\n');
  if (_lastOutput !== results) {
    return commentDirective(results, flags, commentFormat, results);
  }
  return results;
};

export default commentDirective;
