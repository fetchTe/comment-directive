// ###[IF]node=1;sed=/std.err.puts/process.stderr.write/g;
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getMeta} from './_macro_' with { type: 'macro'};
import {
  ARGV,
  hasArgvFlags,
  getArgvOptionTuple,
  prettyPrintJson,
  getArgv,
  getBooly,
  // paint,
} from './bin.utils.ts';
import {
  DEFAULT_OPTIONS,
  commentDirective,
} from './index.ts';
import {
  extensions,
} from './lang.ts';
import type {
  CommentLang,
} from './lang.ts';
import type {
  CommentOptions,
} from './index.ts';

// ###[IF]node=1;rm=3L;
// quickJS-NG standard library modules
import * as os from 'qjs:os';
import * as std from 'qjs:std';


type Options = {
  // cli
  help: boolean;
  verbose: boolean;
  dry: boolean;
  version: boolean;
  env: boolean;
  overwrite: boolean;
  input: string | null;
  output: string | null;
};

type Struc = {
  options: CommentOptions;
  directives: CommentDirectives;
  ctx: Options;
};

// @ts-expect-error 'in' is a resvered key so can't defined in d.ts
const IS_PIPED = !os.isatty(std.in.fileno());

const CMT_OPTIONS_BOOL = [
  'escape',
  'loose',
  'nested',
  'disableCache',
  'throw',
  'keepDirective',
  'keepEmpty',
] as const;

const CMT_OPTIONS_PRIM = [
  'keepPadStart',
  'keepPadIn',
  'keepPadEnd',
  'keepPadEmpty',
] as const;

const istruc: Struc  = {
  options: {...DEFAULT_OPTIONS},
  directives: {},
  ctx: {} as Options,
};


type CommentDirectives = Record<string, boolean | number | string>;

const cli = ({ctx, options, directives}: Struc): boolean => {
  try {
    const {input, output, overwrite, dry, verbose} = ctx;
    // @ts-expect-error 'in' is a resvered key so can't defined in d.ts
    let content: string | null = IS_PIPED ? std.in.readAsString() : null;
    if (!input && !content) {
      std.err.puts('[ERRO] no input file argument or piped stdin\n');
      std.err.puts(`     > for usage information: '${getMeta().name} --help'\n`);
      return false;
    }
    if (input && !content) {
      // check if target exists
      const [stat, statErr] = os.stat(input);
      if (statErr !== 0) {
        std.err.puts(`[ERRO] cannot access input file: '${input}'\n`);
        ctx.verbose && std.err.puts('[ERRO:INFO] ' + std.strerror(-statErr));
        return false;
      }
      if ((stat.mode & os.S_IFMT) !== os.S_IFREG) {
        std.err.puts(`[ERRO] Input path '${input}' is not a regular file.\n`);
        return false;
      }

      // read file content
      content = std.loadFile(input, {binary: false}) as string | null;
      if (typeof content !== 'string') {
        std.err.puts(`[ERRO] Failed to read file "${input}"`);
        return false;
      }
    }

    if (typeof content !== 'string') {
      std.err.puts(`[ERRO] Failed to read/parse input... should never happen`);
      return false;
    }

    // process the content with comment directive
    const result = commentDirective(content, directives, options);

    if (dry) {
      console.log(`[DRY RUN] write to: ${output}`);
      console.log(`[DRY RUN] preview (first 300 chars):\n`);
      console.log(result.substring(0, 300) + (result.length > 300 ? '...' : '') + '\n');
      return true;
    }

    if (!output) {
      // output to stdout
      std.out.puts(result);
      // console.log(result);
      return true;
    }

    // Check if output file exists and handle overwrite
    const [_outputStatResult, outputStatErr] = os.stat(output);
    if (outputStatErr === 0 && !overwrite) {
      std.err.puts(`[ERRO] Output file "${output}" already exists. Use --overwrite to overwrite.`);
      return false;
    }

    // Write to output file
    try {
      verbose && console.log(`[INFO] writing to: ${output}`);
      std.writeFile(output, result);
      verbose && console.log(`[INFO] wrote to  : ${output}`);
      return true;
    } catch (err) {
      std.err.puts(`[ERRO:WRITE] Failed to write to "${output}": `
                    + (((err instanceof Error) ? err.message : null) ?? 'unknown error'));
      ctx.verbose
        && std.err.puts('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
      return false;
    }

  } catch (err) {
    const errMsg = '[ERRO:CATCH] '
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error');
    std.err.puts(errMsg);
    ctx.verbose
       && std.err.puts('[STACK:TRACE]\n' + ((err as any)?.stack ?? 'no stack trace available'));
    return false;
  }
};


const parseArgs = () => {
  const ctx: Options = {
    help: !!hasArgvFlags(['help', 'h']),
    verbose: !!hasArgvFlags(['verbose', 'v']),
    dry: !!hasArgvFlags(['dry', 'n']),
    version: !!hasArgvFlags('version'),
    env: !!hasArgvFlags('env'),
    overwrite: !!hasArgvFlags('overwrite'),
    input: null,
    output: null,
  };
  istruc.ctx = ctx;

  if (ctx.help) {
    if (hasArgvFlags(['lang', 'l'])) {
      console.log(`All Lang Extensions\n> ` + Object.keys(extensions).sort().join(', '));
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
  -l, --lang     <ext>  Set language syntax for comments (e.g: 'js', 'py', 'html')
      --overwrite       Overwrite the input file (DANGER_ZONE)

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
    std.printf(getMeta().version);
    return true;
  }

  const ctxKeys = Object.keys(ctx);
  const optKeys = Object.keys(DEFAULT_OPTIONS);
  const argv = ARGV;
  let target: string | null = null;
  let optionTuples = getArgvOptionTuple(argv);

  if (!IS_PIPED && !optionTuples.find(([k]) => k === 'i' || k === 'input')) {
    target = argv.pop() ?? null;
    optionTuples = getArgvOptionTuple(argv);
  }

  const skipKeys: string[] = [];
  for (const key of CMT_OPTIONS_BOOL) {
    const val = getArgv(key, argv);
    if (val === null) { continue; }
    skipKeys.push(key);
    istruc.options[key] = !!(getBooly(val) ?? DEFAULT_OPTIONS[key]);
  }
  for (const key of CMT_OPTIONS_PRIM) {
    const val = getArgv(key, argv);
    if (val === null) { continue; }
    skipKeys.push(key);
    istruc.options[key] = ((typeof val === 'string'
      ? (Number.isNaN(Number(val)) ? !!getBooly(val) : Number(val) as 1)
      : val) ?? DEFAULT_OPTIONS[key]);
  }

  for (const [key, val] of optionTuples) {
    if (key === 'input' || key === 'i') { istruc.ctx.input = val as string; continue; }
    if (key === 'output' || key === 'o') { istruc.ctx.output = val as string; continue; }
    if (key === 'lang' || key === 'l') {
      const lang = extensions[val as 'js'] as CommentLang;
      if (!lang) {
        std.err.puts(`[ERRO] bad --lang option key of: "${val}"`
        + `\n     > all/langs: ${Object.keys(extensions).join(', ')}`);
        return false;
      }
      istruc.options.multi = lang.multi;
      istruc.options.single = lang.single ?? istruc.options.single;
      continue;
    }
    // cli ctx already handled at this point
    if (skipKeys.includes(key) || ctxKeys.includes(key)) { continue; }
    if (optKeys.includes(key)) { (istruc.options as any)[key] = val; continue; }
    istruc.directives[key] = val;
  }
  // const istruc = optionTuples.reduce((acc, [key, val]) => {}, initStruc);

  istruc.ctx.input = istruc.ctx.input ?? target ?? null;

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


const run = () => {
  try {
    const isOk = parseArgs();
    std.exit(isOk ? 0 : 1);
  } catch (err) {
    const errMsg = '[FATAL][commentDirective:CLI] '
      + (((err instanceof Error) ? err.message : null) ?? 'unknown error');
    std.err.puts(errMsg + '\n');
    std.exit(0);
  }
};
run();
