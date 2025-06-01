/**                                                    @id::generateFromTemplate
@desc: comment template metaprogramming/directive/replacer helper
 - scans for '// ###[IF]' directive & conditionally include/remove/modify based on flags
 - a line-oriented preprocessor built in lieu of a real templating engine
@templates
remove lines    : rm=<N>L
remove comment  : rm=comment
un-comment      : un=comment
sed-like replace: sed=/pattern/replacement/[flags][<N>L]

@example
generateFromTemplate(`
// ###[IF]is_any=1;sed=/ptag/cool/;
export default ptag;
`) === `export default cool;`
***                                                                           */

type CommentFormat = {
  single: RegExp | string;
  multi: [start: RegExp | string, end: RegExp | string];
};

type RemoveLinesAction = {
  type: 'removeLines';
  count: number;
};
type RemoveCommentAction = { type: 'removeComment'; };
type UncommentAction = { type: 'uncomment'; };
type SedAction = {
  type: 'sed';
  pattern: string;
  replacement: string;
  flags: string[];
  lineCount: number; // number of lines to process
};
type Action = RemoveLinesAction | RemoveCommentAction | UncommentAction | SedAction;
type Directive = {
  key: string;
  value: string | number | boolean;
  ifTrue: Action | null;
  ifFalse: Action | null;
};

// Default JavaScript comment format
const DEFAULT_COMMENT_FORMAT: CommentFormat = {
  single: /^\s*\/\/\s*/,
  multi: [/\/\*/, /\*\//]
};

// Create directive regex based on comment format
const createDirectiveRegex = (commentFormat: CommentFormat): RegExp => {
  if (commentFormat.single instanceof RegExp) {
    const singlePattern = commentFormat.single.source.replace(/^\^\\s\*/, '').replace(/\\s\*\$$/, '');
    return new RegExp(`^\\s*${singlePattern}\\s*##+\\[IF\\]\\s*(.+)$`);
  } else {
    const escapedSingle = commentFormat.single.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escapedSingle}\\s*##+\\[IF\\]\\s*(.+)$`);
  }
};

// Try parsing a directive line; returns null if it isnt one
const parseDirectiveLine = (line: string, commentFormat: CommentFormat): Directive | null => {
  const REGEX_CMT_DIRECTIVE = createDirectiveRegex(commentFormat);
  
  // split into [cond, if-true, if-false?]
  const parts = Array.from(line.match(REGEX_CMT_DIRECTIVE) ?? [])?.[1]
    ?.split(';')
    ?.map(p => p.trim())
    ?.filter(Boolean) ?? null;
  if (!parts) { return null; }
  const [condSpec, ifTrue, ifFalse] = parts;
  // condSpec is like "alt=1"
  const condMatch = condSpec?.match(/^([^=]+)=(.+)$/);
  if (!condMatch) {
    console.error(`[ERR][tmplParse] bad condition syntax: ${line}`);
    return null;
  }
  const [_match, key, rawVal] = condMatch;
  if (!key || rawVal === undefined) {
    console.error(`[ERR][tmplParse] bad condition key/value: ${condMatch}`, { key, val: rawVal });
    return null;
  }
  // coerce to number|string
  const value = Number.isInteger(Number(rawVal))
    ? Number(rawVal)
    : rawVal;
  if (!ifTrue) {
    console.error(`[ERR][tmplParse] missing required true condition: ${line}`);
    return null;
  }
  const parseAction = (spec: string): Action | null => {
    const [act, param] = spec.split('=').map(s => s.trim());
    if (param === undefined) {
      console.error(`[ERR][tmplParse] bad/no action param: ${spec}`);
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

    // parse sed directives
    if (act === 'sed') {
      // match sed pattern like /pattern/replacement/[flags][lineCount]
      const sedMatch = param.match(/^\/(.+?)\/(.+?)\/([gim]*)(?:\d*L)?$/);
      if (!sedMatch) {
        console.error(`[ERR][tmplParse] bad sed syntax: ${param}`);
        return null;
      }
      const [, pattern, replacement, flags] = sedMatch;
      if (!pattern || !replacement) {
        console.error(`[ERR][tmplParse] bad sed syntax: ${param}`);
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
    console.error(`[ERR][tmplParse] unknown action: ${spec}`);
    return null;
  };
  return {
    key,
    value,
    ifTrue: parseAction(ifTrue),
    ifFalse: ifFalse ? parseAction(ifFalse) : null,
  } as const;
};

// Helper to create regex from string or return existing regex
const toRegex = (pattern: RegExp | string): RegExp => {
  return pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
};

// apply/processes a directive at lines[i], mutates out, and returns the new index i
const applyDirective = (
  lines: string[],
  i: number,
  dir: Directive,
  flags: Record<string, boolean | number | string>,
  out: string[],
  commentFormat: CommentFormat,
): number => {
  const flagVal = flags[dir.key];
  const conditionMet = flagVal === dir.value;
  const action = conditionMet ? dir.ifTrue : dir.ifFalse;
  // always drop the directive comment itself
  if (!action) { return i; }
  // skip the next - count lines
  if ('removeLines' === action.type) { return i + action.count; }
  // sed'in -> global
  if (action.type === 'sed' && action.flags?.includes('g')) {
    const { pattern, replacement, flags } = action;
    // global regex, clear, replace, re-add
    out.length = 0;
    lines.join('\n').replace(
      new RegExp(pattern, flags.join('')),
      replacement,
    ).split(/\r?\n/).forEach(l => out.push(l));
    return -1;
  }
  // sed'in
  if (action.type === 'sed') {
    const { pattern, replacement, flags, lineCount } = action;
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
      out.push(currentLine.replace(
        // global regex handled seperate
        new RegExp(pattern, flags.length ? flags.join('') : undefined),
        replacement,
      ));
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
    const isUncomment = action.type === 'uncomment';
    let currentLine = lines[j];
    if (!currentLine) { return j; }
    
    const multiStart = toRegex(commentFormat.multi[0]);
    const multiEnd = toRegex(commentFormat.multi[1]);
    
    // if single-line comment case
    const scar = currentLine.search(multiStart);
    const scdr = currentLine.search(multiEnd);
    if (scar !== -1 && scdr !== -1) {
      // compensate rmed white space
      const beforeComment = (currentLine.trim().match(multiStart) ? '  ' : '')
        + currentLine.slice(0, scar);
      const commentStartMatch = currentLine.slice(scar).match(multiStart);
      const commentStartLength = commentStartMatch ? commentStartMatch[0].length : 2;
      const commentEndMatch = currentLine.slice(scdr).match(multiEnd);
      const commentEndLength = commentEndMatch ? commentEndMatch[0].length : 2;
      const commentContent = currentLine.slice(scar + commentStartLength, scdr);
      const afterComment = currentLine.slice(scdr + commentEndLength);
      // keep the content inside the comment and remove the markers
      isUncomment && out.push(
        `${beforeComment}${commentContent}${afterComment}`.replace(/\s+$/, ''),
      );
      // remove the comment and its content, keeping the rest of the line
      !isUncomment
        && `${beforeComment}${afterComment}`.trim().length
        && out.push(`${beforeComment}${afterComment}`);
      return j;
    }

    // multi-line comment
    const commentLines: string[] = [];
    let inComment = false;
    let beforeComment = '';
    let afterComment = '';
    while (j < lines.length) {
      currentLine = lines[j];
      if (!currentLine) {
        j++;
        continue;
      }
      const mcar = currentLine.search(multiStart);
      const mcdr = currentLine.search(multiEnd);
      if (!inComment && mcar !== -1) {
        inComment = true;
        // compensate rmed white space
        beforeComment = '  ' + currentLine.slice(0, mcar);
        const commentStartMatch = currentLine.slice(mcar).match(multiStart);
        const commentStartLength = commentStartMatch ? commentStartMatch[0].length : 2;
        const afterStart = currentLine.slice(mcar + commentStartLength);
        if (mcdr !== -1) {
          // comment ends on the same line
          const commentEndMatch = afterStart.match(multiEnd);
          const commentEndIndex = afterStart.search(multiEnd);
          const commentEndLength = commentEndMatch ? commentEndMatch[0].length : 2;
          commentLines.push(afterStart.slice(0, commentEndIndex));
          afterComment = currentLine.slice(mcdr + commentEndLength);
          j++;
          break;
        }
        commentLines.push(afterStart);
        j++;
        continue;
      }
      if (inComment) {
        if (mcdr !== -1) {
          commentLines.push(currentLine.slice(0, mcdr));
          const commentEndMatch = currentLine.slice(mcdr).match(multiEnd);
          const commentEndLength = commentEndMatch ? commentEndMatch[0].length : 2;
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

    // output the comment content without markers, preserving surrounding code
    isUncomment && out.push(
      `${beforeComment}${commentLines.join('\n')}${afterComment}`.replace(/\s+$/, ''),
    );
    // output only the surrounding code, removing the comment entirely
    !isUncomment
      && `${beforeComment}${afterComment}`.trim().length
      && out.push(`${beforeComment}${afterComment}`);

    return j - 1;
  }

  return i;
};

const generateFromTemplate = (
  tmpl: string,
  flags: Record<string, boolean | number | string>,
  commentFormat: CommentFormat = DEFAULT_COMMENT_FORMAT,
): string => {
  const lines = tmpl.split(/\r?\n/);
  const outputLines: string[] = [];
  const gDirectives: Directive[] = [];

  // global sed's
  for (const line of lines) {
    const dir = parseDirectiveLine(line, commentFormat);
    if (dir?.ifTrue?.type === 'sed' && dir.ifTrue.flags.includes('g')) {
      applyDirective(lines.join('\n').split('\n'), 0, dir, flags, lines, commentFormat);
      continue;
    }
    if (dir?.ifFalse?.type === 'sed' && dir.ifFalse.flags.includes('g')) {
      applyDirective(lines.join('\n').split('\n'), 0, dir, flags, lines, commentFormat);
      continue;
    }
  }

  // @TODO: rm passin-around/mutatin outputLines logic
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.length) {
      outputLines.push(line ?? '');
      continue;
    }
    const dir = parseDirectiveLine(line, commentFormat);
    // keep as-is
    if (!dir) {
      outputLines.push(line);
      continue;
    }
    if (dir?.ifTrue?.type === 'sed' && dir.ifTrue.flags.includes('g')) {
      gDirectives.push(dir);
      continue;
    }
    if (dir?.ifFalse?.type === 'sed' && dir.ifFalse.flags.includes('g')) {
      gDirectives.push(dir);
      continue;
    }
    // apply directive -> advancin i as needed
    i = applyDirective(lines, i, dir, flags, outputLines, commentFormat);
  }

  return outputLines.join('\n');
};

