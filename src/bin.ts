/**                                                                       @about
@desc: bin for both quickjs executable and npm bin; uses itself to build quickjs
       compliant version of comment-directive which is used to build the executable
@cmd : make build && make build_bin_quickjs
@NOTE: OS specific builds handled via: .github/workflows/on-release.yml
***                                                                           */
// ###[IF]node=1;sed=/process.stderr.write/std.err.puts/g;
/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getMeta} from './_macro_' with { type: 'macro'};
import cliReap from 'cli-reap';
import {
  createStain,
  getColorSpace,
} from 'stain';
import {
  prettyPrintJson,
  toEntries,
  toKeys,
  castBooly,
} from './bin.utils.ts';
import {
  DEFAULT_OPTIONS,
  commentDirective,
} from './index.ts';
import {
  extensions,
} from './lang.ts';
import type {
  CommentRegexOption,
} from './lang.ts';
import type {
  CommentOptions,
} from './index.ts';
// ###[IF]node=1;un=comment;
/*
// quickJS-NG standard library modules
import * as os from 'qjs:os';
import * as std from 'qjs:std';
*/
// ###[IF]node=1;rm=3L;
import * as fs from 'node:fs';
import * as path from 'node:path';

type CommentDirectives = Record<string, boolean | number | string>;

type Options = {
  // cli
  help: boolean;
  verbose: boolean;
  dry: boolean;
  version: boolean;
  env: boolean;
  overwrite: boolean;
  banner: string | null;
  input: string | null;
  output: string | null;
};

type Args = {
  options: CommentOptions;
  directives: CommentDirectives;
  ctx: Options;
};

// ###[IF]node=1;un=comment;
/*
// @ts-expect-error 'in' is a resvered key so can't defined in d.ts
let IS_PIPED = !os.isatty(std.in.fileno());
*/
// ###[IF]node=1;rm=1L;
let IS_PIPED = !process.stdin.isTTY;

// comment-directive options that are flags
const CLI_FLAGS = {
  escape: DEFAULT_OPTIONS.escape,
  loose: DEFAULT_OPTIONS.loose,
  nested: DEFAULT_OPTIONS.nested,
  disableCache: DEFAULT_OPTIONS.disableCache,
  keepDirective: DEFAULT_OPTIONS.keepDirective,
  keepEmpty: DEFAULT_OPTIONS.keepEmpty,
  // if cli, we want to throw an error to set the exit status
  throw: true,
} as const;

// comment-directive options that are primitaves (not flags)
const CLI_OPTS = {
  keepPadStart: DEFAULT_OPTIONS.keepPadStart,
  keepPadIn: DEFAULT_OPTIONS.keepPadIn,
  keepPadEnd: DEFAULT_OPTIONS.keepPadEnd,
  keepPadEmpty: DEFAULT_OPTIONS.keepPadEmpty,
} as const;


// ###[IF]node=1;rm=line;
const COLOR_SPACE = getColorSpace();
// ###[IF]node=1;un=comment;
// const COLOR_SPACE = getColorSpace(undefined, std?.getenviron?.(), undefined, os.isatty(std.out.fileno()));

// ANSI cli color stainer
// @NOTE: quickjs requires use of std.getenviron to get ENV vars needed for colorSpace
const stain = createStain({colorSpace: COLOR_SPACE});


/**
 * ensures the dir exists otherwise it creates it
 * @param  {string} filePath
 * @param  {boolean} [verbose=false]
 * @return {void} - invoke within a try/catch for error propagation
 */
const ensureDirSync = (filePath: string, verbose = false) => {
  verbose && console.log(`[INFO] ensureDirSync: ${filePath}`);
  // ###[IF]node=1;rm=2L;
  if (fs.existsSync(path.dirname(filePath))) { return; }
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  // ###[IF]node=1;un=comment;
  /*
  if (filePath.includes('..')) {
    verbose && console.log('[INFO] ensureDirSync:skip: relative path');
    return;
  }
  const lastSlashIndex = filePath.lastIndexOf('/');
  // ignore root paths like '/file.js'
  if (lastSlashIndex < 1) {
    verbose && console.log('[INFO] ensureDirSync:skip: root path');
    return;
  }
  // pretty rudimentary but i aint dinkin around with all the edge cases (cough windows)
  const idirc = filePath.substring(0, lastSlashIndex);
  verbose && console.log(`[INFO] ensureDirSync:idirc: ${idirc}`);
  const parts = idirc.split('/');
  let ipath = parts[0];
  for (let i = 1; i < parts.length; i++) {
    ipath += '/' + parts[i];
    verbose && console.log(`[INFO] ensureDirSync:ipath: ${ipath}`);
    if (!ipath) { continue; }
    // attempt to create the directory - returns a negative errno on failure
    const ret = os.mkdir(ipath, 0o777);
    if (ret < 0 && ret !== -std.Error.EEXIST) {
      verbose && std.err.puts(`${stain.red.bold('[ERRO]')} ensureDirSync: ${ret}\n`);
      throw new Error(`Failed to create directory '${ipath}': ${std.strerror(-ret)}`);
    }
  }
  */
};


/**
 * runs the core cli workflow to read input, apply comment directives, and write output
 * @param  {Args} - {ctx, options, directives}
 * @return {Promise<boolean>}
 */
const cli = async ({ctx, options, directives}: Args): Promise<boolean> => {
  try {
    const {banner, input, overwrite, dry, verbose} = ctx;
    const output = ctx.output ? ctx.output : (overwrite ? input : null);
    let content: string | null = null;
    if (IS_PIPED) {
      content = '';
      // ###[IF]node=1;rm=1L;
      for await (const chunk of process.stdin) { content += chunk; }
      // ###[IF]node=1;un=comment;
      /*
      // @ts-expect-error 'in' is a resvered key so can't defined in d.ts
      for await (const chunk of std.in.readAsString()) { content += chunk; }
      */
    }

    if (!input && !content) {
      process.stderr.write(`${stain.red.bold('[ERRO]')} no input file argument or piped stdin\n`);
      process.stderr.write(`     > for usage information: '${getMeta().name} --help'\n`);
      return false;
    }

    // check if target exists
    if (input && !content) {
      // ###[IF]node=1;un=comment;
      // const [stat, statErr] = os.stat(input);
      // ###[IF]node=1;sed=/!fs.existsSync(input)/statErr !== 0/;
      if (!fs.existsSync(input)) {
        process.stderr.write(`${stain.red.bold('[ERRO]')} cannot access input file: '${input}'\n`);
        // ###[IF]node=1;un=comment;
        // ctx.verbose && process.stderr.write(stain.red.bold('[ERRO:statErr] ') + std.strerror(-statErr));
        return false;
      }
      // ###[IF]node=1;sed=/!fs.statSync(input)?.isFile()/(stat.mode & os.S_IFMT) !== os.S_IFREG/;
      if (!fs.statSync(input)?.isFile()) {
        process.stderr.write(`${stain.red.bold('[ERRO]')} Input path '${input}' is not a regular file\n`);
        return false;
      }

      // read file content
      // ###[IF]node=1;rm=1L;
      content = fs.readFileSync(input, 'utf-8');
      // ###[IF]node=1;un=comment;
      // content = std.loadFile(input, {binary: false}) as string | null;
      if (typeof content !== 'string') {
        process.stderr.write(`${stain.red.bold('[ERRO]')} Failed to read file "${input}"`);
        return false;
      }
    }

    if (typeof content !== 'string') {
      process.stderr.write(`${stain.red.bold('[ERRO]')} Failed to read/parse input... should never happen`);
      return false;
    }

    // process the content with comment directive
    const result = (banner ? banner + '\n' : '') + commentDirective(content, directives, options);

    if (dry) {
      const dy = stain.yellow.bold('[DRY RUN]');
      console.log(`${dy} write to: ${output}`);
      console.log(`${dy} preview (first 300 chars):\n`);
      console.log(result.substring(0, 300) + (result.length > 300 ? '...' : '') + '\n');
      return true;
    }

    if (!output) {
      // output to stdout
      // ###[IF]node=1;sed=/process.stdout.write/std.out.puts/;
      process.stdout.write(result);
      // console.log(result);
      return true;
    }

    // ensures no foot is blown off; otherwise trust the output is true
    if (input && (input === output) && !overwrite) {
      process.stderr.write(`${stain.red.bold('[ERRO]')} Need to use ${stain.red.bold('--overwrite')}`
                           + ` to overwrite the input (${stain.red.bold.underline('!DANGER-ZONE!')})`);
      return false;
    }

    // write to output file
    try {
      ensureDirSync(output, verbose);
      verbose && console.log(`[INFO] writing to: ${output}`);
      // ###[IF]node=1;sed=/fs.writeFileSync/std.writeFile/;
      fs.writeFileSync(output, result);
      verbose && console.log(`[INFO] wrote to  : ${output}`);
      return true;
    } catch (err) {
      process.stderr.write(`${stain.red.bold('[ERRO:WRITE]')} Failed to write to "${output}": `
                    + (((err instanceof Error) ? err.message : null) ?? 'unknown error'));
      ctx.verbose
        && process.stderr.write('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
      return false;
    }

  } catch (err) {
    const errMsg = stain.red.bold('[ERRO:CATCH] ')
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error');
    process.stderr.write(errMsg);
    ctx.verbose
       && process.stderr.write('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
    return false;
  }
};


/**
 * prints the formatted help and usage message to stdout
 * @return {void}
 */
const logHelpMsg = () => {
  const title = stain.white.bold;
  const toTitle = (val: string) => stain.black.white.bg.bold('#') + ' ' + title(val);
  const g = stain.white.dim;
  const b = stain.iblue;
  const y = stain.yellow;
  const bl = stain.bold;
  const cy = stain.cyan;
  const pu = stain.purple.bold;
  const rr = stain.red.bold.underline;
  const kv = bl('value');
  const ver = g(`(v${getMeta().version})`);
  const bo = g('[');
  const be = g(']');
  const ll = g('┈ '.repeat(3));
  const lll = g('┈ '.repeat(4));
  const name = getMeta().name;
  console.log(`
${toTitle('USAGE')} ${ver}
  ${bl(name)} ${bo}${b('options')}...${be} ${bo}${g('--')}${y('directive')}=<${kv}>...${be} <${pu('input')}>

${toTitle('DIRECTIVE')}
  --<${y('key')}>=<${kv}>  ${ll} key-value flags (controls ${name} conditional logic)
  --${bo}${y('opt')}${be}=${bo}${kv}${be}  ${ll} options for ${name}; value-less flags == true
                          (e.g: --${y('keepDirective')} --${y('loose')} --${y('escape')}=false)

${toTitle('OPTIONS')}
  -${b('b')}, --${b('banner')}     <${bl('str')}>  Append string atop output to indicate it's auto-generated
  -${b('i')}, --${b('input')}     <${pu('file')}>  Specify the input; overrides the positional argument;
                          reads from stdin (piped) if no input positional/option defined
  -${b('o')}, --${b('output')}    <${bl('file')}>  Specify the output; defaults to stdout
  -${b('l')}, --${b('lang')}       <${bl('ext')}>  Set explicit language syntax for comments (e.g: 'js', 'py', 'html');
                           if unset, uses the file extension if valid; otherwise falls back to (c-like) 'js'
      --${b('overwrite')}         Overwrite input if: no output or the same (${rr('DANGER_ZONE')})

  -${b('n')}, --${b('dry-run')}   ${ll}  Perform a dry run (without writing to a file) & print preview
  -${b('v')}, --${b('verbose')}   ${ll}  Enable verbose logging for debugging
  -${b('h')}, --${b('help')}    ${lll}  Display this help message and exit
      --${b('version')}   ${ll}  Display the version number and exit
      --${b('env')}     ${lll}  Print all parsed arguments, options, and directives, then exit;
                          useful for debugging how the CLI interprets input/options

${toTitle('EXAMPLES')}
  `.replaceAll(/(\s)(-+)/g, g(' $2'))
    .replaceAll(/(\.\.+|<|>|=|'|,|:|;|\)|\()/g, g('$1'))
    .replaceAll(name, cy(name)) + `
  ${g(`# process 'input.ts' with a comment directive of '--prod=1' with stdout output`)}
  ${name} --${y('prod')}=1 --banner="// AUTO GENERATED" ${pu('input.ts')}
  ${g(`# 'in.py' input to 'out.py' output with a mix of options/directives`)}
  ${name} --${b('lang')}=py --${y('keepPadEmpty')}=false --${y('isCmt')}=1 -${b('o')} out.py ${pu('in.py')}
  ${g('# pipe content and redirect the processed output to a new file')}
  cat ${pu('input.md')} | ${name} --${b('lang')}=md --${y('kool')}=1 > output.md
`.trim().replaceAll(name, cy(name)));
};


/**
 * parses command line args and configures execution context
 * @return {Promise<boolean>} true on success, false on invalid args or downstream failure
 */
const parseArgs = async (): Promise<boolean> => {
  const reap = cliReap();
  // argv context
  const ctx: Options = {
    help: !!reap.flag(['h', 'help']),
    verbose: !!reap.flag(['v', 'verbose']),
    dry: !!reap.flag(['n', 'dry']),
    version: !!reap.flag('version'),
    env: !!reap.flag('env'),
    overwrite: !!reap.flag('overwrite'),
    input: reap.opt(['i', 'input']),
    output: reap.opt(['o', 'output']),
    banner: reap.opt(['b', 'banner']),
  };

  // arg param for cli()
  const iargs: Args  = {
    ctx,
    options: {...DEFAULT_OPTIONS},
    directives: {},
  };


  if (ctx.help) {
    if (reap.flag(['lang', 'l'])) {
      console.log('All Lang Extensions\n> ' + Object.keys(extensions).sort().join(', '));
      return true;
    }
    logHelpMsg();
    return true;
  }

  if (ctx.version) {
    // ###[IF]node=1;sed=/process.stdout.write/std.out.puts/;
    process.stdout.write(getMeta().version);
    return true;
  }

  // reap flag values for comment-directive
  for (const [key, _val] of toEntries(CLI_FLAGS)) {
    // need to check for opt first if '--escape false' notation
    iargs.options[key] = castBooly(reap.opt(key))
      ?? reap.flag(key)
      ?? CLI_FLAGS[key]
      ?? false;
  }

  // reap option values for comment-directive
  for (const [key, val] of toEntries(CLI_OPTS)) {
    const opt = reap.opt(key);
    if (opt === null) { continue; }
    const num = Number(opt);
    iargs.options[key] = (num === 1 || num === 2)
      ? num
      : castBooly(opt) ?? val;
  }

  // snag lang, but we don't process till after input is set to auto set lang
  let lang = (reap.opt(['l', 'lang']) ?? 'auto');

  // loop/check for other possible comment-directive options
  for (const key of toKeys(DEFAULT_OPTIONS)) {
    const opt = reap.opt(key);
    if (opt === null) { continue; }
    (iargs.options as any)[key] = opt;
  }

  // ignore pipe if explict input set
  if (iargs.ctx.input) { IS_PIPED = false; }

  // get the positional is any
  const target = !IS_PIPED && !ctx.input ? reap.pos().pop() ?? null : null;

  // last, but not least, we snag all possible option keys and assume they are directives;
  // if double-dash/end-of-options present assume last arg is the input
  const [posits, eofInput] = reap.end()
    ? [reap.cur().slice(0, reap.cur().indexOf('--')), reap.pos().pop()]
    : [reap.cur(), null];
  const posDirectives = posits.filter(val => val.startsWith('-'));
  for (const opt of posDirectives) {
    let key = opt.replace(/^--?/, '');
    if (!key.length) { continue; }
    key = key.split('=')[0] ?? key;
    const val = reap.opt(key);
    if (val === null) { continue; }
    iargs.directives[key] = val;
  }

  iargs.ctx.input = eofInput ?? iargs.ctx.input ?? target ?? null;
  // ###[IF]node=1;rm=1L;
  iargs.ctx.input = iargs.ctx.input ? path.resolve(path.normalize(iargs.ctx.input)) : iargs.ctx.input;
  // ###[IF]node=1;rm=1L;
  iargs.ctx.output = iargs.ctx.output ? path.resolve(path.normalize(iargs.ctx.output)) : iargs.ctx.output;
  // ###[IF]node=1;un=comment;
  /*
  const [ipath, ierr] = iargs.ctx.input ? os.realpath(iargs.ctx.input) : [iargs.ctx.input, null];
  iargs.ctx.input = !ierr && ipath ? ipath : iargs.ctx.input;
  const [opath, oerr] = iargs.ctx.output ? os.realpath(iargs.ctx.output) : [iargs.ctx.output, null];
  iargs.ctx.output = !oerr && opath ? opath : iargs.ctx.output;
  */

  // handle 'auto' lang or default to js
  if (lang === 'auto') {
    lang = IS_PIPED || !iargs.ctx.input
      ? 'js'
      : iargs.ctx.input.split('.').pop() ?? 'js';
    // fallback to 'js'
    lang = extensions[lang as 'js'] ? lang : 'js';
  }

  // get custom lang or err out if no match
  const lext = extensions[lang as 'js'] as CommentRegexOption;
  if (!lext) {
    const sp = '\n       ';
    process.stderr.write(`${stain.red.bold('[ERRO]')} bad '--lang' cli/arg of: "${lang}"`
    + `  --->  must be one of the following:\n${sp}${Object.keys(extensions)
      .sort()
      .reduce((a, k, i) => ((a[Math.floor(i / 10)] ??= []).push(k), a), [] as string[][])
      .map(v => v.join(', '))
      .join(sp)}\n`);
    return false;
  }
  iargs.options.multi = lext.multi;
  iargs.options.single = lext.single ?? iargs.options.single;

  if (ctx.env || ctx.verbose) {
    const cmtd = '(' + stain.cyan('comment-directive') + ')';
    const tt = (val = '') => stain.black.bold.white.bg('#') + ' ' + stain.bold.underline(val);
    console.log(`> ${stain.cyan.bold(getMeta().name)} (v${getMeta().version})
${tt('TARGET')}    : ${stain.green(iargs.ctx.input ?? (IS_PIPED ? 'piped' : '???'))}
${tt('OUTPUT')}    : ${stain.green(iargs.ctx.output ?? 'stdout')}`);
    console.log(`${tt('OPTIONS (cli)')}\n${prettyPrintJson(ctx)}`);
    console.log(`${tt('OPTIONS ' + cmtd)}\n${prettyPrintJson(iargs.options)}`);
    console.log(`${tt('ARGUMENTS ' + cmtd)}\n${prettyPrintJson(iargs.directives)}`);
  }
  if (ctx.env) { return true; }

  const res = await cli(iargs);
  return res;
};


/**
 * entry point that invokes argument parsing and exits the process with appropriate code
 * @return {Promise<void>}
 */
const run = async () => {
  try {
    const isOk = await parseArgs();
    // ###[IF]node=1;sed=/process/std/;
    process.exit(isOk ? 0 : 1);
  } catch (err) {
    const errMsg = '[FATAL][commentDirective:CLI] '
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error');
    process.stderr.write(errMsg + '\n');
    // ###[IF]node=1;sed=/process/std/;
    process.exit(1);
  }
};
run();
