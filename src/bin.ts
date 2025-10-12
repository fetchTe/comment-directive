/**                                                                       @about
@desc: bin for both quickjs and npm bin; uses itself to build quickjs compliant
       version of comment-directive which is used to build the executables
***                                                                           */
// ###[IF]node=1;sed=/process.stderr.write/std.err.puts/g;
/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getMeta} from './_macro_' with { type: 'macro'};
import cliReap from 'cli-reap';
import { IS_QUICKJS } from 'globables';
import { createStain } from 'stain';
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

type Struc = {
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

const istruc: Struc  = {
  options: {...DEFAULT_OPTIONS},
  directives: {},
  ctx: {} as Options,
};


const ensureDirSync = (filePath: string, verbose = false) => {
  verbose && console.log(`[INFO] ensureDirSync: ${filePath}`);
  // ###[IF]node=1;rm=2L;
  if (fs.existsSync(path.dirname(filePath))) { return; }
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  // ###[IF]node=1;un=comment;
  /*
  if (filePath.includes('..')) {
    verbose && console.log(`[INFO] ensureDirSync:skip: relative path`);
    return;
  }
  const lastSlashIndex = filePath.lastIndexOf('/');
  // ignore root paths like '/file.js'
  if (lastSlashIndex < 1) {
    verbose && console.log(`[INFO] ensureDirSync:skip: root path`);
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
      verbose && std.err.puts(`[ERRO] ensureDirSync: ${ret}\n`);
      throw new Error(`Failed to create directory '${ipath}': ${std.strerror(-ret)}`);
    }
  }
  */
};


const cli = async ({ctx, options, directives}: Struc): Promise<boolean> => {
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
      process.stderr.write('[ERRO] no input file argument or piped stdin\n');
      process.stderr.write(`     > for usage information: '${getMeta().name} --help'\n`);
      return false;
    }

    // check if target exists
    if (input && !content) {
      // ###[IF]node=1;un=comment;
      // const [stat, statErr] = os.stat(input);
      // ###[IF]node=1;sed=/!fs.existsSync(input)/statErr !== 0/;
      if (!fs.existsSync(input)) {
        process.stderr.write(`[ERRO] cannot access input file: '${input}'\n`);
        // ###[IF]node=1;un=comment;
        // ctx.verbose && process.stderr.write('[ERRO:INFO] ' + std.strerror(-statErr));
        return false;
      }
      // ###[IF]node=1;sed=/!fs.statSync(input)?.isFile()/(stat.mode & os.S_IFMT) !== os.S_IFREG/;
      if (!fs.statSync(input)?.isFile()) {
        process.stderr.write(`[ERRO] Input path '${input}' is not a regular file\n`);
        return false;
      }

      // read file content
      // ###[IF]node=1;rm=1L;
      content = fs.readFileSync(input, 'utf-8');
      // ###[IF]node=1;un=comment;
      // content = std.loadFile(input, {binary: false}) as string | null;
      if (typeof content !== 'string') {
        process.stderr.write(`[ERRO] Failed to read file "${input}"`);
        return false;
      }
    }

    if (typeof content !== 'string') {
      process.stderr.write('[ERRO] Failed to read/parse input... should never happen');
      return false;
    }

    // process the content with comment directive
    const result = (banner ? banner + '\n' : '') + commentDirective(content, directives, options);

    if (dry) {
      console.log(`[DRY RUN] write to: ${output}`);
      console.log('[DRY RUN] preview (first 300 chars):\n');
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
      process.stderr.write('[ERRO] Need to use --overwrite to overwrite the input (!DANGER-ZONE!)');
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
      process.stderr.write(`[ERRO:WRITE] Failed to write to "${output}": `
                    + (((err instanceof Error) ? err.message : null) ?? 'unknown error'));
      ctx.verbose
        && process.stderr.write('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
      return false;
    }

  } catch (err) {
    const errMsg = '[ERRO:CATCH] '
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error');
    process.stderr.write(errMsg);
    ctx.verbose
       && process.stderr.write('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
    return false;
  }
};


const parseArgs = () => {
  const reap = cliReapLoose();

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
  istruc.ctx = ctx;

  if (ctx.help) {
    if (reap.flag(['lang', 'l'])) {
      console.log('All Lang Extensions\n> ' + Object.keys(extensions).sort().join(', '));
      return true;
    }

    console.log(`
# USAGE (v${getMeta().version} - github.com/fetchTe/comment-directive)
  ${getMeta().name} [options...] [--directive=<value>...] [input_file]

# DIRECTIVE
  --<key>=<value>       comment-directive key-value flags (controls the conditional logic)
  --[opt]=[value]       comment-directive options; value-less flags are treated as true
                        (e.g: --keepDirective=true --loose)

# OPTION
  -i, --input   <file>  Specify the input; overrides the positional argument;
                        Reads from stdin (piped) if no input positional/option defined
  -o, --output  <file>  Specify the output; defaults to stdout
  -a, --append   <str>  Append string atop output to indicate it's auto-generated
  -l, --lang     <ext>  Set language syntax for comments (e.g: 'js', 'py', 'html')
      --overwrite       Overwrite input if: no output or the same (DANGER_ZONE)

  -n, --dry-run         Perform a dry run (without writing to a file) & print preview
  -v, --verbose         Enable verbose logging for debugging
  -h, --help            Display this help message and exit
      --version         Display the version number and exit
      --env             Print all parsed arguments, options, and directives, then exit;
                        Useful for debugging how the CLI interprets input/options

# EXAMPLES
  # process 'input.ts' with a comment directive of '--prod=1' with stdout output
  ${getMeta().name} --prod=1 input.ts
  # 'in.py' input to 'out.py' output with a mix of options/directives
  ${getMeta().name} --lang=py --keepPadEmpty=false --isCmt=1 -o out.py in.py
  # pipe content and redirect the processed output to a new file
  cat input.md | ${getMeta().name} --lang=md --kool=1 > output.md
`);
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
    istruc.options[key] = castBooly(reap.opt(key))
      ?? reap.flag(key)
      ?? CLI_FLAGS[key]
      ?? false;
  }

  // reap option values for comment-directive
  for (const [key, val] of toEntries(CLI_OPTS)) {
    const opt = reap.opt(key);
    if (opt === null) { continue; }
    const num = Number(opt);
    istruc.options[key] = (num === 1 || num === 2)
      ? num
      : castBooly(opt) ?? val;
  }

  // get custom lang and err out if no match
  const lang = (reap.opt(['l', 'lang']) ?? 'js') as 'js';
  const lext = extensions[lang] as CommentRegexOption;
  if (!lext) {
    process.stderr.write(`[ERRO] bad --lang option key of: "${lang}"`
    + `\n     > all/langs: ${Object.keys(extensions).join(', ')}`);
    return false;
  }
  istruc.options.multi = lext.multi;
  istruc.options.single = lext.single ?? istruc.options.single;

  // loop/check for other possible comment-directive options
  for (const key of toKeys(DEFAULT_OPTIONS)) {
    const opt = reap.opt(key);
    if (opt === null) { continue; }
    (istruc.options as any)[key] = opt;
  }

  // ignore pipe if explict input set
  if (istruc.ctx.input) { IS_PIPED = false; }

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
    istruc.directives[key] = val;
  }

  istruc.ctx.input = eofInput ?? istruc.ctx.input ?? target ?? null;
  // ###[IF]node=1;rm=1L;
  istruc.ctx.input = istruc.ctx.input ? path.resolve(path.normalize(istruc.ctx.input)) : istruc.ctx.input;
  // ###[IF]node=1;rm=1L;
  istruc.ctx.output = istruc.ctx.output ? path.resolve(path.normalize(istruc.ctx.output)) : istruc.ctx.output;
  // ###[IF]node=1;un=comment;
  /*
  const [ipath, ierr] = istruc.ctx.input ? os.realpath(istruc.ctx.input) : [istruc.ctx.input, null];
  istruc.ctx.input = !ierr && ipath ? ipath : istruc.ctx.input;
  const [opath, oerr] = istruc.ctx.output ? os.realpath(istruc.ctx.output) : [istruc.ctx.output, null];
  istruc.ctx.output = !oerr && opath ? opath : istruc.ctx.output;
  */

  if (ctx.env || ctx.verbose) {
    console.log(`> ${getMeta().name} (v${getMeta().version})
# TARGET    : ${istruc.ctx.input ?? (IS_PIPED ? 'piped' : '???')}
# OUTPUT    : ${istruc.ctx.output ?? 'stdout'}`);
    console.log(`# CLI OPTIONS\n${prettyPrintJson(ctx)}`);
    console.log(`# COMMENT DIRECTIVE OPTIONS\n${prettyPrintJson(istruc.options)}`);
    console.log(`# COMMENT DIRECTIVE ARGUMENTS\n${prettyPrintJson(istruc.directives)}`);
  }
  if (ctx.env) { return true; }

  return cli(istruc);
};


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
    process.exit(0);
  }
};
run();
