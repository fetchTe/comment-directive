export type CommentFormat = {
  single: [start: RegExp | string, end?: null | RegExp | string];
  multi: [start: RegExp | string, end: RegExp | string];
};

export type FlagStruc = Record<string, boolean | number | string>;

export type ActionRemoveLines = { type: 'removeLines'; count: number; };

export type ActionRemoveComment = { type: 'removeComment'; };

export type ActionUnComment = { type: 'uncomment'; };

export type ActionSedReplace = {
  type: 'sed';
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


/**
 * type gaurd for sed action
 * @param  {Directive | null} dir
 * @return {dir is Directive<ActionSedReplace>}
 */
const isSedDirective = (dir: Directive | null): dir is Directive<ActionSedReplace> =>
  dir?.ifTrue?.type === 'sed' || dir?.ifFalse?.type === 'sed';


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
const toRegex = (pattern: RegExp | string): RegExp =>
  (pattern instanceof RegExp
    ? pattern
    : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));


/**
 * create the regex directive pattern to match against
 * @param  {CommentFormat} commentFormat
 * @return {RegExp}
 */
const createDirectiveRegex = (commentFormat: CommentFormat): RegExp => {
  const [singleStart, singleEnd] = commentFormat.single;
  if (singleStart instanceof RegExp) {
    const startPattern = singleStart.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    if (singleEnd) {
      const endPattern = singleEnd instanceof RegExp
        ? singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '')
        : singleEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^\\s*${startPattern}\\s*##+\\[IF\\]\\s*(.+?)\\s*${endPattern}\\s*$`);
    }
    return new RegExp(`^\\s*${startPattern}\\s*##+\\[IF\\]\\s*(.+)$`);
  }
  const escapedStart = singleStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (singleEnd) {
    const escapedEnd = typeof singleEnd === 'string'
      ? singleEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : singleEnd.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    return new RegExp(`^\\s*${escapedStart}\\s*##+\\[IF\\]\\s*(.+?)\\s*${escapedEnd}\\s*$`);
  }
  return new RegExp(`^\\s*${escapedStart}\\s*##+\\[IF\\]\\s*(.+)$`);
};


/**
 * action directive  parser
 * @param  {string} spec
 * @return {Actions | null}
 */
const parseAction = (spec: string): Actions | null => {
  const [act, param] = spec.split('=').map(s => s.trim());
  if (param === undefined) {
    console.error(`[ERR:parseAction] bad/no action param: ${spec}`);
    return null;
  }
  if (act === 'rm') {
    if (param === 'comment') { return { type: 'removeComment' }; }
    // remove X lines
    if ((/^\d+L$/).test(param)) {
      return { type: 'removeLines', count: parseInt(param.slice(0, -1), 10) };
    }
  }
  if (act === 'un' && param === 'comment') { return { type: 'uncomment' }; }
  if (act === 'sed') {
    // match sed pattern like /pattern/replacement/[flags][lineCount]
    const sedMatch = param.match(/^\/(.+?)\/(.+?)\/([gim]*)(?:\d*L)?$/);
    if (!sedMatch) {
      console.error(`[ERR:parseAction] bad sed syntax: ${param}`);
      return null;
    }
    const [, pattern, replacement, flags] = sedMatch;
    if (!pattern || !replacement) {
      console.error(`[ERR:parseAction] bad sed syntax: ${param}`);
      return null;
    }
    // line count if present -> 2L
    const lineCountMatch = param.match(/(\d+)L$/);
    return {
      type: 'sed',
      pattern,
      replacement,
      flags: (flags ?? '').split(''), // regex flags
      lineCount: lineCountMatch?.[1]
        ? Number.parseInt(lineCountMatch[1])
        : 1,
    };
  }
  console.error(`[ERR:parseAction] unknown action: ${spec}`);
  return null;
};


/**
 * parse directive line or null
 * @param  {null | string[]} parts - directive parts
 * @param  {string} line           - line - used to report errors
 * @return {Directive | null}
 */
const parseDirective = (parts: null | string[], line: string): Directive | null => {
  if (!parts) { return null; }
  const [condSpec, ifTrue, ifFalse] = parts;
  // condSpec is like "alt=1"
  const condMatch = condSpec?.match(/^([^=]+)=(.+)$/);
  if (!condMatch) {
    console.error(`[ERR:parseDirective] bad condition syntax: ${line}`);
    return null;
  }
  const [_match, key, val] = condMatch;
  if (!key || val === undefined) {
    console.error(`[ERR:parseDirective] bad condition key/value: ${condMatch}`, {key, val});
    return null;
  }
  if (!ifTrue) {
    console.error(`[ERR:parseDirective] missing required true condition: ${line}`);
    return null;
  }
  return {
    key,
    value: Number.isInteger(Number(val)) ? Number(val) : val,
    ifTrue: parseAction(ifTrue),
    ifFalse: ifFalse ? parseAction(ifFalse) : null,
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
  lines: string[],
  i: number,
  dir: Directive,
  flags: FlagStruc,
  out: string[],
  commentFormat: CommentFormat,
): number => {
  const flagVal = flags[dir.key];
  const conditionMet = flagVal === dir.value
    // coerced values to string for comparision to avoid "5" != 5
    || String(flagVal) === String(dir.value);

  const action = conditionMet ? dir.ifTrue : dir.ifFalse;
  // console.log('action', action)
  // always drop the directive comment itself
  if (!action) { return i; }
  // skip the next - count lines
  if ('removeLines' === action.type) { return i + action.count; }

  // sed'in -> global
  if (action.type === 'sed' && action.flags?.includes('g')) {
    const {
      pattern, replacement, flags,
    } = action;
    // global regex, clear, replace, re-add
    out.length = 0;
    lines.join('\n').replace(
      new RegExp(pattern, flags.join('')),
      replacement,
    ).split(/\r?\n/).forEach(l => out.push(l));
    return -1;
  }

  // sed'in -> line
  if (action.type === 'sed') {
    const {
      pattern, replacement, flags, lineCount,
    } = action;
    let j = i + 1;
    let processedLines = 0;
    const directiveRegex = createDirectiveRegex(commentFormat);
    while (j < lines.length && processedLines < lineCount) {
      const currentLine = lines[j];
      if (!currentLine) {
        out.push(currentLine ?? '');
        j++;
        continue;
      }
      // ignore/omit stacked sed comment directives
      if (directiveRegex.test(currentLine)) {
        j++;
        continue;
      }
      const nxt = currentLine.replace(
        new RegExp(pattern, flags.length ? flags.join('') : undefined),
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

  if ('removeComment' === action.type || 'uncomment' === action.type) {
    let j = i + 1;
    let currentLine = lines[j];

    if (!currentLine) { return j; }
    const isUncomment = action.type === 'uncomment';
    const multiStart = toRegex(commentFormat.multi[0]);
    const multiEnd = toRegex(commentFormat.multi[1]);

    // check if start/end patterns equal -> like python ('''|""")
    const sameStartEnd = multiStart.source === multiEnd.source;

    // if single-line comment case
    const scar = currentLine.search(multiStart);
    let scdr = -1;

    if (scar !== -1) {
      // for same start/end patterns, find the next occurrence after the start
      if (sameStartEnd) {
        const nextMatch = currentLine.slice(scar + 1).search(multiEnd);
        if (nextMatch !== -1) {
          scdr = scar + 1 + nextMatch;
        }
      } else {
        // different start/end patterns
        scdr = currentLine.search(multiEnd);
      }
    }

    // if single-line comment case
    if (scar !== -1 && scdr !== -1 && scdr > scar) {
      // get the actual matched comment markers to know their length
      const commentStartMatch = currentLine.slice(scar).match(multiStart);
      const commentEndMatch = currentLine.slice(scdr).match(multiEnd);
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
      const mcar = currentLine.search(multiStart);

      if (!inComment && mcar !== -1) {
        inComment = true;
        beforeComment = currentLine.slice(0, mcar);
        const commentStartMatch = currentLine.slice(mcar).match(multiStart);
        commentStartLength = commentStartMatch ? commentStartMatch[0].length : 3;
        const afterStart = currentLine.slice(mcar + commentStartLength);

        // check for end marker on the same line (but after the start)
        let mcdr = -1;
        if (sameStartEnd) {
          // if same start/end patterns -> find next occurrence
          mcdr = afterStart.search(multiEnd);
          // adjust to absolute position
          if (mcdr !== -1) { mcdr = mcar + commentStartLength + mcdr; }
        } else {
          mcdr = currentLine.search(multiEnd);
          // make sure end comes after start
          if (mcdr !== -1 && mcdr <= mcar) { mcdr = -1; }
        }

        // comment ends on the same line
        if (mcdr !== -1) {
          const commentEndMatch = currentLine.slice(mcdr).match(multiEnd);
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
        const mcdr = currentLine.search(multiEnd);
        if (mcdr !== -1) {
          commentLines.push(currentLine.slice(0, mcdr));
          const commentEndMatch = currentLine.slice(mcdr).match(multiEnd);
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
    if (isUncomment) {
      const uncommentedContent = commentLines.join('\n');
      const resultLine = `${beforeComment}${uncommentedContent}${afterComment}`;
      if (resultLine.includes('\n')) {
        // multi-line case
        resultLine.split('\n').forEach(line => out.push(line.replace(/\s+$/, '')));
        return j - 1;
      }
      out.push(resultLine.replace(/\s+$/, ''));
      return j - 1;
    }

    // remove comment: only if in comment of next line is single-line comment
    if (inComment || (currentLine && toRegex(commentFormat.single[0]).test(currentLine))) {
      const resultLine = `${beforeComment}${afterComment}`;
      resultLine.trim().length > 0 && out.push(resultLine);
    } else if (currentLine) {
      // non comment line
      out.push(currentLine);
    }
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
  commentFormat: CommentFormat = { single: [/\/\/\s*/, null], multi: [/\/\*/, /\*\//] },
  _lastOutput = tmpl,
): string => {
  const lines = tmpl.split(/\r?\n/);
  const outputLines: string[] = [];
  const directiveRegex = createDirectiveRegex(commentFormat);

  // split into [cond, if-true, if-false?]
  const splitDirectiveLine = (line: string): string[] | null =>
    Array.from(line.match(directiveRegex) ?? [])?.[1]
      ?.split(';')
      ?.map(p => p.trim())
      ?.filter(Boolean) ?? null;

  // global sed's
  for (const line of lines) {
    const parts = splitDirectiveLine(line);
    if (!parts) { continue; }
    const dir = parseDirective(parts, line);
    if (isSedDirectiveG(dir)) {
      applyDirective(lines.join('\n').split('\n'), 0, dir, flags, lines, commentFormat);
      continue;
    }
  }

  // loop the lines and apply directive
  // @todo: remove this mutation/pass-around-logic
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.length) {
      outputLines.push(line ?? '');
      continue;
    }
    const dir = parseDirective(splitDirectiveLine(line), line);
    if (!dir) {
      outputLines.push(line);
      continue;
    }
    // skip sed global
    if (isSedDirectiveG(dir)) { continue; }
    // apply directive -> advancin i as needed
    i = applyDirective(lines, i, dir, flags, outputLines, commentFormat);
  }

  const results = outputLines.join('\n');
  // nested comments
  if (_lastOutput !== results) {
    return commentDirective(results, flags, commentFormat, results);
  }
  return results;
};

export default commentDirective;

