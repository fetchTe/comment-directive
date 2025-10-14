import {getMeta} from './_macro_' with { type: 'macro'};
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import type {SpawnSyncOptions} from 'node:child_process';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';

const DIRNAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../');
let BIN: string[] = [];
const BIN_TESTS = [
  ['node', path.join(DIRNAME, 'dist', 'bin.js')],
  [path.join(DIRNAME, 'dist', getMeta().name), '--no-color'],
];

// remove any personal BUN_MAKE env vars
const ENV = Object.fromEntries(
  Object.entries(process?.env ?? {})?.filter(([key]) => !key.startsWith('BUN_MAKE_')),
);

type CliResult = {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
};

const cli = (
  args: string[] = [],
  opts: SpawnSyncOptions = {},
  logErrs = true,
): CliResult => {
  const [exe, ...exeArgs] = BIN;
  const {status, stdout, stderr} = spawnSync(exe ?? 'exit', exeArgs.concat(args).filter(Boolean), {
    encoding: 'utf8',
    stdio: 'pipe',
    ...opts,
    env: Object.assign({NO_COLOR: '1', IS_TEST: '1'}, ENV, opts?.env ?? {}),
  });
  const res: CliResult = {
    ok: status === 0,
    status: status ?? -1,
    stdout: (stdout ?? '').toString().trim(),
    stderr: (stderr ?? '').toString().trim(),
  };
  if (!res.ok && logErrs) {
    res.stderr.length && console.error('[CLI:FAIL:stderr]\n' + res.stderr + '\n');
    res.stdout.length && console.error('[CLI:FAIL:stdout]\n' + res.stdout + '\n');
    console.error('[CLI:FAIL:args]\n' + JSON.stringify(args) + '\n');
  }
  return res;
};

const cleanupDir = (dir: string) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
};

const createTempDir = (id = 'cli'): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), `comment-directive-${id}-`));

const isFile = (fpath: string): boolean =>
  fs.existsSync(fpath) && fs.statSync(fpath)?.isFile();

const readFile = (fpath: string): string => fs.readFileSync(fpath, 'utf8');

type FixtureOptions = {
  filename?: string;
  content?: string;
};

const DIRECTIVE_FIXTURE = [
  '// ###[IF]prod=1;un=comment;rm=comment;',
  "// console.log('prod only');",
  "console.log('always');",
].join('\n');

const EXPECTED_PROD = [
  "console.log('prod only');",
  "console.log('always');",
].join('\n');

const EXPECTED_DEFAULT = "console.log('always');";

const HELP_USAGE = `${getMeta().name} [options...] `
  + '[--directive=<value>...] <input>';

const writeFixture = (dir: string, options: FixtureOptions = {}): string => {
  const filename = options.filename ?? 'input.js';
  const content = options.content ?? DIRECTIVE_FIXTURE;
  const target = path.join(dir, filename);
  fs.writeFileSync(target, content, 'utf8');
  return target;
};

const runTestType = (binTest: string[]) => {
  BIN = binTest;
  const testType = binTest[0]?.split('/')?.pop() ?? 'BAD';
  console.log('## test -> ' + testType);
  describe(`comment-directive cli -> ${testType}`, () => {
    let tempDirs: string[] = [];

    beforeEach(() => {
      tempDirs = [];
    });

    afterEach(() => {
      for (const dir of tempDirs) {
        cleanupDir(dir);
      }
      tempDirs = [];
    });

    const registerDir = (dir: string): string => {
      tempDirs.push(dir);
      return dir;
    };

    describe('help & metadata output', () => {
      test('displays formatted help for --help', () => {
        const res = cli(['--help']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toContain('# USAGE');
        expect(res.stdout).toContain(HELP_USAGE);
        expect(res.stdout).toContain('# OPTIONS');
        expect(res.stdout).toContain('# DIRECTIVE');
        expect(res.stdout).toContain('# EXAMPLES');
      });

      test('displays formatted help for -h', () => {
        const res = cli(['-h']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toContain('# USAGE');
        expect(res.stdout).toContain(HELP_USAGE);
      });

      test('lists all known languages when combining --help and --lang', () => {
        const res = cli(['--help', '--lang']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toContain('All Lang Extensions');
        expect(res.stdout).toContain('bash, bat, c');
      });

      test('prints the CLI version', () => {
        const res = cli(['--version']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe(getMeta().version);
      });

      test('prints environment metadata with --env', () => {
        const tempDir = registerDir(createTempDir('env'));
        const fixture = writeFixture(tempDir);
        const res = cli([
          '--env',
          '--dry',
          '--identifier',
          '##A##',
          '--input',
          fixture,
        ]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toContain('# TARGET    : ');
        expect(res.stdout).toContain('##A##');
        expect(res.stdout).toContain('# OPTIONS (comment-directive)');
        expect(res.stdout).toContain('# ARGUMENTS (comment-directive)');
      });
    });


    describe('argument validation', () => {
      test('fails when missing input', () => {
        const res = cli([], {}, false);
        expect(res.ok).toBe(false);
        expect(res.status).not.toBe(0);
        expect(res.stderr).toContain('[ERRO] no input file argument or piped stdin');
      });

      test('fails when input file is missing', () => {
        const missing = path.join(DIRNAME, 'tmp-missing-file.txt');
        const res = cli(['--input', missing], {}, false);
        expect(res.ok).toBe(false);
        expect(res.stderr).toContain(`cannot access input file: '${missing}'`);
      });

      test('fails when input file is missing - nested dir', () => {
        const noop = '/tmp/tmp/tmp/yolojolo.147852369';
        const res = cli(['--prod=1', '--input', noop]);
        expect(res.ok).toBe(false);
        expect(res.stderr).toInclude(`cannot access input file: '${noop}'`);
      });

      test('fails when input path is not a regular file', () => {
        const res = cli(['--input', DIRNAME], {}, false);
        expect(res.ok).toBe(false);
        expect(res.stderr).toContain(`Input path '${DIRNAME}' is not a regular file`);
      });

      test('fails for unknown language key', () => {
        const tempDir = registerDir(createTempDir('lang'));
        const fixture = writeFixture(tempDir);
        const res = cli(['--lang', 'invalid', '--input', fixture], {}, false);
        expect(res.ok).toBe(false);
        expect(res.stderr).toContain(`bad '--lang' cli/arg of: "invalid"`);
      });
    });


    describe('processing behavior', () => {

      test('processes directive flags using input file and stdout output', () => {
        const tempDir = registerDir(createTempDir('stdout'));
        const fixture = writeFixture(tempDir);
        const res = cli(['--prod=1', '--input', fixture]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe(EXPECTED_PROD);
      });

      test('respects directives when omitted', () => {
        const tempDir = registerDir(createTempDir('default'));
        const fixture = writeFixture(tempDir);
        const res = cli(['--input', fixture]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe(EXPECTED_DEFAULT);
      });

      test('accepts piped stdin content', () => {
        const res = cli(['--prod=1'], {input: DIRECTIVE_FIXTURE});
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe(EXPECTED_PROD);
      });

      test('writes results to specified output file', () => {
        const tempDir = registerDir(createTempDir('output'));
        const fixture = writeFixture(tempDir);
        const outDir = path.join(tempDir, 'nested', 'dir');
        const output = path.join(outDir, 'result.js');
        const res = cli(['--prod=1', '--input', fixture, '--output', output]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('');
        expect(isFile(output)).toBe(true);
        expect(readFile(output).trim()).toBe(EXPECTED_PROD);
      });

      test('banner appends additional header content before processed output', () => {
        const tempDir = registerDir(createTempDir('banner'));
        const fixture = writeFixture(tempDir);
        const appendHeader = '# AUTOGEN\n';
        const res = cli(['--prod=1', '--banner', appendHeader, '--input', fixture]);
        expect(res.ok).toBe(true);
        expect(res.stdout.startsWith('# AUTOGEN\n')).toBe(true);
        expect(res.stdout).toContain(EXPECTED_PROD);
      });

      test('shows dry run preview and does not create output file', () => {
        const tempDir = registerDir(createTempDir('dry'));
        const fixture = writeFixture(tempDir);
        const output = path.join(tempDir, 'preview', 'result.js');
        const res = cli(['--prod=1', '--dry', '--input', fixture, '--output', output]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toContain('[DRY RUN] write to:');
        expect(res.stdout).toContain(EXPECTED_PROD);
        expect(isFile(output)).toBe(false);
      });

      test('refuses to overwrite input without --overwrite flag', () => {
        const tempDir = registerDir(createTempDir('overwrite'));
        const fixture = writeFixture(tempDir);
        const res = cli(['--input', fixture, '--output', fixture], {}, false);
        expect(res.ok).toBe(false);
        expect(res.stderr).toContain('Need to use --overwrite');
        expect(readFile(fixture).trim()).toBe(DIRECTIVE_FIXTURE);
      });

      test('overwrites input when --overwrite is provided', () => {
        const tempDir = registerDir(createTempDir('overwrite-ok'));
        const fixture = writeFixture(tempDir);
        const res = cli(['--prod=1', '--input', fixture, '--output', fixture, '--overwrite']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('');
        expect(readFile(fixture).trim()).toBe(EXPECTED_PROD);
      });


      test('should handle lang argument and set lang', () => {
        const tempDir = registerDir(createTempDir('stdout'));
        const fixture = writeFixture(tempDir, {
          filename: 'example.yolo',
          content: `
#!/bin/sh

# ###[IF]prod=1;rm=comment
# remove me!
echo "test"`,
        });
        const res = cli(['--prod=1', '--input', fixture, '--lang=sh']);
        expect(res.ok).toBe(true);
        expect(res.stdout).toInclude('echo "test"');
        expect(res.stdout).not.toInclude('remove me!');
      });

      test('should auto detect lang', () => {
        const tempDir = registerDir(createTempDir('stdout'));
        const fixture = writeFixture(tempDir, {
          filename: 'example.sh',
          content: `
#!/bin/sh

# ###[IF]prod=1;rm=comment
# remove me!
echo "test"`,
        });
        const res = cli(['--prod=1', '--input', fixture]);
        expect(res.ok).toBe(true);
        expect(res.stdout).toInclude('echo "test"');
        expect(res.stdout).not.toInclude('remove me!');
      });


    });
  });
};

BIN_TESTS.map(runTestType);

