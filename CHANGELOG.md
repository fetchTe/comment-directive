# `CHANGELOG.md`


## [`v2.0.0`](https://github.com/fetchTe/comment-directive/releases/tag/v2.0.0) - `2025-07-03`

### ▎BREAKING

+ Makefile: rename `bin*` targets and source files to `cli*`

### ▎Added

+ CLI: easier handling/processing of `comment-directive` (both npm/node and standalone)
  - node CLI (`make build_bin` -> `./src/cli.ts`); install via `npm install -g comment-directive`
  - standalone QuickJS binary (`make build_bin_quickjs` -> `./src/cli.quickjs.ts`); download & install via [releases -> linux/mac/windows](https://github.com/fetchTe/comment-directive/releases/latest)
  - README.md docs/usage
+ `.github`: build QuickJS for CLI tests and upload SHA-256 checksums for release artifacts
+ `package.json`: `devDependencies` add `cli-reap` and `globables` for cli

### ▎Changed

+ ESLint/config and code style (spacing, comments, ternary)
+ `src/lang.ts`: rename regex/option types
+ Move type definitions under `src/d.ts/` (`globals.d.ts`, `lib.js_os.d.ts`, `lib.js_std.d.ts`)
+ Dependency: bump `stain` to `1.4.0`
+ Makefile
  - reorganize targets/flags (`BFLG_*`, `ENV`, `QUIET`)
  - set `help` as default
  - build/test executables before tests

### ▎Fixed

+ d.ts: correct `getenviron` return type
+ CI: default make target to `release` in workflows and init build process
+ Makefile: use POSIX `=` string comparison
+ Tests: fix nested README test case



## [`v1.2.1`](https://github.com/fetchTe/comment-directive/releases/tag/v1.2.1) - `2025-07-03`

### ▎Fixed

+ Remove arrant/forgotten `console.log` in `src/index.ts`



## [`v1.2.0`](https://github.com/fetchTe/comment-directive/releases/tag/v1.2.0) - `2025-07-02`

### ▎Added

+ `rm` `@<stop>` marker logic



## [`v1.1.0`](https://github.com/fetchTe/comment-directive/releases/tag/v1.1.0) - `2025-06-30`

### ▎Added

+ no-operation `no=op;` - negated condition logic



## [`v1.0.0`](https://github.com/fetchTe/comment-directive/releases/tag/v1.0.0) - `2025-06-18`

+ init(★): init commit → ★


