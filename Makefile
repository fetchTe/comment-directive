#------------------------------------------------------------------------------#
# bun make-ing (no oven or preheating required; just: make build)
# @docs: www.gnu.org/software/make/manual/make.txt
# @note: compliant per POSIX.1-2024, but doesn't ascend to strict divine compliance
#      : tested against pdpmake (github.com/rmyorston/pdpmake) as .POSIX is a lie
# @cred: github.com/fetchTe/bun-make
#------------------------------------------------------------------------------#
.PRAGMA: command_comment posix_2024
.NOTPARALLEL:


#------------------------------------------------------------------------------#
# @note: sets default (make) command e.g. if 'all: build' executes 'make build' on 'make'
#------------------------------------------------------------------------------#
.PHONY: all
all: help


#------------------------------------------------------------------------------#
# @id:filepath constants
# @note: you can set the default value for any non-underscore Make constant/flag
#        via an environment variable using 'BUN_MAKE_<VAR>' e.g: 'BUN_MAKE_DST=./out'
#------------------------------------------------------------------------------#
# source dir
SRC = $(CURDIR)/src
# entrypoint
ENT = $(SRC)/index.ts $(SRC)/lang.ts $(SRC)/cli.ts
# build/output dir
DST = $(CURDIR)/dist
# test(s) (if not defined, recursive test search: bun.sh/docs/cli/test#run-tests)
TES = $(SRC)/index.test.ts $(SRC)/index.keep.test.ts $(SRC)/index.pad.test.ts $(SRC)/README.test.ts $(SRC)/cli.test.ts
# node/binaries (tsc, eslint)
NOM = $(CURDIR)/node_modules
BIN = $(NOM)/.bin
# eslint config
ESL = $(CURDIR)/eslint.config.mjs


#------------------------------------------------------------------------------#
# @id:flags (regardless of place/order, Make tenderly accepts all variable assignments)
#  > make WATCH=1 target
#  > make target WATCH=1
#  > WATCH=1 make target
#    - a shell environment variable assignment that is passed to 'make';
#      persists throughout the entire invocation, including sub/recursive ones
#------------------------------------------------------------------------------#

#: bun flags
#! [? ] bun build flag(s) (e.g: make BUN="--banner='// bake until golden brown'")
BUN ?=

#: build flags
#! [?1] builds the cjs (common js) target on 'make release'
CJS ?= 1
#! [?js|mjs] default esm build extension
EXE ?= js
#! [?0] build target env (-1=bun, 0=node, 1=dom, 2=dom+iife, 3=dom+iife+userscript)
TAR ?= 0

#! [?1] builds minified (*.min.{mjs,cjs,js}) targets on 'make release'
MIN ?= 1

#: env flags
#! [?1] fail fast (bail) on the first test or lint error
BAIL ?= 1
#! [?qjs] sets the QuickJs (qjs) path for the build_cli_quickjs target
BIN_QJS ?= qjs
#! [?DEV|PROD|TEST] sets the 'ENV' & 'IS_*' static build variables (else auto-set)
ENV ?= DEV
#! [?0] sets the 'IS_TEST' static build variable (always 1 if test target)
TEST ?= 0
#! [?0] sets the '--watch' flag for bun/tsc (e.g: WATCH=1 make test)
WATCH ?= 0

#: log flags
#! [?0] enables verbose logging and sets the 'IS_DEBUG' static build variable
DEBUG ?= 0
#! [?0] disables pretty-printed/log target (INIT/DONE) info
QUIET ?= 0
#! [?0] disables color logging/ANSI codes
NO_COLOR ?= 0


#------------------------------------------------------------------------------#
# @id:extra customize-able bun flags
#------------------------------------------------------------------------------#
# bun shared/common flags (*.*) -> applied to both default/build & min builds
# BFLG_SHR= --packages=external
BFLG_SHR= --bundle --external=qjs*
# bun build lib (non-min) flags (*.{js,cjs,mjs})
BFLG_LIB= --sourcemap=linked
# bun build min flags (*.min.{js,cjs,mjs})
BFLG_MIN= --minify --sourcemap=none


#------------------------------------------------------------------------------#
# @id:cross-os variable (assumes unix-y or msys2 on windows, if not, adjust accordingly)
#------------------------------------------------------------------------------#
BIN_BUN= bun
# required for help only; otherwise optional
_VFLG  = $$([ "$(DEBUG)" = "1" ] && echo " --verbose" || echo "")
BIN_AWK= awk
CMD_RM = rm -fr $(_VFLG)
CMD_CP = cp $(_VFLG)
CMD_MK = mkdir -p $(_VFLG)
DEVNUL = /dev/null
TMCOLS = $$(tput cols 2>$(DEVNUL) || echo 0)
# for non-GNU-y make implementations (pdpmake) that follow the POSIX standard
MKFILE = $$([ -z "$(MAKEFILE_LIST)" ] && echo "./Makefile" || echo "$(MAKEFILE_LIST)")
# GNUMAKEFLAGS is for flags that do not alter behavior, per the GNU scripture
GNUMAKEFLAGS += --no-print-directory


#------------------------------------------------------------------------------#
# @id:internal
#------------------------------------------------------------------------------#
# bun .js build to target iife (acts as a conditional)
_BIIF != { [ "$(TAR)" = "2" ] || [ "$(TAR)" = "3" ] && echo "iife"; } || echo "esm"
# bun build target
_BTAR = $$( { [ "$(TAR)" = "-1" ] && echo "bun" || { [ "$(TAR)" = "0" ] && echo "node" || echo "browser"; }; })

# min logic for cjs
_MIN_CJS=$$([ "$(MIN)" = "0" ] && echo "0" || echo "$(CJS)")
# bail flag
_BAIL = $$([ "$(BAIL)" = "1" ] && echo " --bail" || echo "")
# watch flag
_WFLG = $$([ "$(WATCH)" = "1" ] && echo " --watch" || echo "")
# bun default positional
_BPOS = build
# bun format
_BFMT = esm
# bun ext file/format
_BEXE = js
# bun variable flags - if undefined ignored
_BFLG_VAR =--target=$(_BTAR) $(BFLG_SHR)
# bun output location
_BOUT =

# bun private/dynamic flags
_BFLG =
# bun '--define' env/vars - strings need to be escaped -> "\"example\""
_BFLG_DEF =--define ENV="\"$(ENV)\"" --define IS_FORMAT="\"$(_BFMT)\"" --define IS_DEBUG="$(DEBUG)" --define IS_DEV="$(IS_DEV)" --define IS_PROD="$(IS_PROD)" --define IS_TEST="$(IS_TEST)" --define IS_WATCH="$(WATCH)"
# eslint flags
_EFLG =
# tsc flags
_TFLG =

# lazy conditionals; passed to factories to set flags dynamically
# @note: re-evaluated each time they're referenced in a target, rather than being
#        evaluated at first parsed, in javascript terms: $$(cmd) is like () => cmd
IS_DEV  = $$([ "$(ENV)" = "DEV" ]  && echo 1 || echo 0)
IS_PROD = $$([ "$(ENV)" = "PROD" ]  && echo 1 || echo 0)
IS_TEST = $$([ "$(ENV)" = "TEST" ] && echo 1 || echo $(TEST))


#------------------------------------------------------------------------------#
# @id::release
#------------------------------------------------------------------------------#
.PHONY: run
run: ## executes entry-point (./src/index.ts) via 'bun run'
	@$(BIN_BUN) run $(_WFLG) $(ENT)

.PHONY:release
release: ## clean, setup, build, lint, test, aok (everything but the kitchen sink)
	@$(MAKE) MSG="release" LEN="-1" _init
	@# rm/mk/and build fresh with ENV="TEST"
	@$(MAKE) MSG="release:test" SYM="--" COLOR="1;36" _init
	@$(CMD_RM) "$(DST)" || true
	@$(CMD_MK) "$(DST)" || { $(MAKE) MSG="failed to create: $(DST)" _erro; exit 1; }
	@# buid in prod with IS_TEST (skip min builds)
	@$(MAKE) ENV="PROD" TEST="1" MIN="0" _build_code_factory || { $(MAKE) MSG="target failed: build_code ...abort" _erro; exit 1; }
	@$(MAKE) build_cli
	@# need to build quickjs executable to test against
	@$(MAKE) build_cli_quickjs
	@# lint es/ts (must run indv in order to exit properly)
	@$(MAKE) MSG="release:lint" SYM="--" COLOR="1;36" _init
	@$(MAKE) BAIL="1" lint_eslint || { $(MAKE) MSG="target failed: lint_eslint ...abort" _erro; exit 1; }
	@$(MAKE) BAIL="1" lint_tsc || { $(MAKE) MSG="target failed: lint_tsc ...abort" _erro; exit 1; }
	@# run tests (could also be run pre-lint if preferred)
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" ENV="TEST" _bun_factory || { $(MAKE) MSG="target failed: 'test' ...abort" _erro; exit 1; }
	@# remove exe/quickjs bin from release -> packaged seperatly via tagged release
	@$(CMD_RM) "$(DST)/comment-directive" || true
	@# everythings aok -> re-build with min builds and without IS_TEST
	@$(MAKE) MSG="release:build" SYM="--" COLOR="1;36" _init
	@$(CMD_RM) "$(DST)" || true
	@$(CMD_MK) "$(DST)" || { $(MAKE) MSG="failed to create: $(DST)" _erro; exit 1; }
	@$(MAKE) ENV="PROD" TEST="0" MIN="$(MIN)" _build_code_factory
	@$(MAKE) build_cli
	@$(MAKE) MSG="release" LEN="-1" _done


#------------------------------------------------------------------------------#
# @id::build targets
# @note: indv build(s) is far more reliable and provides better control of output
#------------------------------------------------------------------------------#

.PHONY: build
build: ## builds the .{js,d.ts} (skips: lint, test, and .min.* build)
	@$(MAKE) MSG="build ENV=$(ENV) -> IS_PROD=$(IS_PROD)" LEN="60" _init
	@$(MAKE) MIN="0" CJS="0" _build_code_factory
	@$(MAKE) MSG="build ENV=$(ENV) -> IS_PROD=$(IS_PROD)" LEN="60" _done

.PHONY: build_cli
build_cli:  ## builds node cli/bin output
	@$(MAKE) MSG="build_cli" LEN="-1" _init
	@# force shebang banner comment ./src
	@$(MAKE) ENT="$(SRC)/cli.ts" \
		BFLG_SHR="$(BFLG_SHR) --banner='#!/usr/bin/env node'" \
		MIN="0" CJS="0" _bun_code_factory
	@$(MAKE) MSG="build_cli" LEN="-1" _done

.PHONY: build_cli_quickjs
build_cli_quickjs:  ## compiles cli quickjs binary/executable
	@$(MAKE) MSG="build_cli_quickjs" LEN="-1" _init
	@$(BIN_BUN) run $(SRC)/cli.ts --escape  --node=1 \
		--input=$(SRC)/cli.ts \
		--output=$(SRC)/cli.quickjs.ts \
		--banner="// !! AUTO GENERATED <-> DO NOT EDIT DIRECTLY !!"
	@$(MAKE) ENT="$(SRC)/cli.quickjs.ts" MIN="0" CJS="0" _bun_code_factory
	@$(BIN_QJS) --std --module --compile "$(DST)/cli.quickjs.js" --out $(DST)/comment-directive
	@$(MAKE) MSG="build_cli_quickjs" LEN="-1" _done

.PHONY: build_cjs
build_cjs:  ## builds the .cjs export
	@$(MAKE) _BFMT="cjs" _BEXE="cjs" _BFLG="$(BFLG_LIB)" _bun_code_factory

.PHONY: build_cjs_min
build_cjs_min:  # builds the .min.cjs export
	@$(MAKE) _BFMT="cjs" _BEXE="min.cjs" _BFLG="$(BFLG_MIN)" _bun_code_factory

.PHONY: build_esm
build_esm:  ## builds the .js (esm) export
	@$(MAKE) _BFMT="$(_BIIF)" _BEXE="$(EXE)" _BFLG="$(BFLG_LIB)" _bun_code_factory

.PHONY: build_esm_min
build_esm_min:  # builds the .min.js (esm) export
	@$(MAKE) _BFMT="$(_BIIF)" _BEXE="min.$(EXE)" _BFLG="$(BFLG_MIN)" _bun_code_factory

.PHONY: build_declarations
build_declarations: ## builds typescript .d.{ts,mts,cts} declarations
	@$(MAKE) MSG="build_declarations" _init
	@# correctness matters not, only the output, so strict/checks are disabled
	@$(BIN)/tsc --project "$(CURDIR)/tsconfig.types.json" $(_TFLG) \
		--declaration \
		--declarationMap \
		--declarationDir "$(DST)" \
		--emitDeclarationOnly \
		--noEmit false \
		--stripInternal \
		--noCheck
	@# remove quickjs type defs (no quotes, need to expand via shell)
	@$(CMD_RM) $(DST)/cli.quickjs.d.* || true
	@# a conveniently hacky method to generate *.d.{cts,mts}
	@echo "Array.from(new Bun.Glob('**/*.d.ts').scanSync({cwd:'$(DST)',absolute:!0})).forEach(f=>{const c=(e,d=[f,f.slice(0,-2)+e])=>{$(DEBUG) && console.log(d.join(' -> '));try{require('fs').copyFileSync(...d)}catch(c){console.error(c)}};c('cts'),c('mts')});" \
		| $(BIN_BUN) run -
	@$(MAKE) MSG="build_declarations" _done


#------------------------------------------------------------------------------#
# @id:build factory(s)
#------------------------------------------------------------------------------#
.ONESHELL:
.PHONY: _build_code_factory
_build_code_factory: # private code build .{js,cjs,mjs,d.ts}
	@# basic a-ok checks (+424µs - if curious)
	@test -d "$(SRC)" || { $(MAKE) MSG="missing source directory: $(SRC)" _erro; exit 1; }
	@test -d "$(NOM)" || { $(MAKE) MSG="missing node_modules, to fix run: make install" _erro; exit 1; }
	@command -v "$(BIN_BUN)" >$(DEVNUL) 2>&1 || { $(MAKE) MSG="bun is not installed/found and required: https://bun.sh" _erro; exit 1; }
	@# could run parrell via & or 'make -j4 build_esm build_esm ...' if need 4 speed
	@$(MAKE) build_esm || { $(MAKE) MSG="build_esm target failed... abort" _erro; exit 1; }
	@$(MAKE) build_declarations || { $(MAKE) MSG="build_declarations target failed... abort" _erro; exit 1; }
	@[ "$(CJS)" = "0" ] && true || $(MAKE) build_cjs || { $(MAKE) MSG="build_cjs target failed... abort" _erro; exit 1; }
	@# indv conds needed since pdpmake lacks .ONESHELL
	@[ "$(MIN)" = "0" ] && true || $(MAKE) build_esm_min || { $(MAKE) MSG="build_esm_min target failed... abort" _erro; exit 1; }
	@[ "$(_MIN_CJS)" = "0" ] && true || $(MAKE) build_cjs_min || { $(MAKE) MSG="build_cjs_min target failed... abort" _erro; exit 1; }

.PHONY: _bun_factory
_bun_factory: # private bun factory
	@$(MAKE) MSG="bun $(_BPOS) $(_BEXE) / $(_BFMT)" _init
	@# print/debug full command
	@[ "$(DEBUG)" != "1" ] && true || echo " $(BIN_BUN) $(_VFLG) $(_BPOS) $(BUN) $(_BFLG_VAR) $(_BFLG) $(_WFLG) $(_BAIL) $(_BFLG_DEF) $(_BOUT)"
	@# flag priority -> last takes the cake
	@$(BIN_BUN) $(_VFLG) $(_BPOS) $(BUN) $(BFLG_SHR) $(_BFLG_VAR) $(_BFLG) $(_WFLG) $(_BAIL) \
		$(_BFLG_DEF) \
		$(_BOUT)

.PHONY: _bun_code_factory
_bun_code_factory: # private bun code build (wrapper) factory
	@[ "$(_BIIF)" = "iife" ] && [ "$(_BIIF)" != "$(_BFMT)" ] && exit 0 || true
	@$(MAKE) _BPOS="build" _BOUT="--format $(_BFMT) --entry-naming \"[dir]/[name].$(_BEXE)\" --entrypoints $(ENT) --outdir \"$(DST)\"" _bun_factory


#------------------------------------------------------------------------------#
# @id::cli
#------------------------------------------------------------------------------#
.PHONY: _cli_install_factory
_cli_install_factory: # private cli/bin uninstall helper
	@PKG=$$(npm pkg get name | tr -d '"'); \
	[ "$${PKG}" = "" ] && exit 1; \
	PACK=$$(npm pack | tail -n 1); \
	printf "\n\e[1;33mnpm install -g %s\033[0m\n" "$${PKG}"; \
	npm install -g "$${PACK}"; \
	RESULT=$$?; \
	rm -v "$${PACK}"; \
	exit $$RESULT

.PHONY: _cli_uninstall_factory
_cli_uninstall_factory: # private cli uninstall helper
	@PKG="$$(npm pkg get name | tr -d '"')"; \
	[ "$${PKG}" = "" ] && exit 1; \
	printf "\n\e[1;33mnpm uninstall -g %s\033[0m\n" "$${PKG}"; \
	npm uninstall -g "$${PKG}"; \
	exit $$?

.PHONY: cli
cli:  ## builds, packs, and installs globally via npm (cli shebang included)
	@$(MAKE) MSG="cli" LEN="-1" _init
	@$(MAKE) build_cli
	@$(MAKE) _cli_install_factory || { $(MAKE) MSG="cli target failed... abort" _erro; exit 1; }
	@$(MAKE) MSG="cli" LEN="-1" _done
	@printf "\n  %s\n" "$$(npm pkg get name | tr -d '"')"

.PHONY: cli_uninstall
cli_uninstall:  ## uninstalls the globally installed package (reverts above 'make cli')
	@$(MAKE) MSG="cli_uninstall" LEN="-1" _init
	@$(MAKE) _cli_uninstall_factory || { $(MAKE) MSG="cli_uninstall target failed... abort" _erro; exit 1; }
	@$(MAKE) MSG="cli_uninstall" LEN="-1" _done

#------------------------------------------------------------------------------#
# @id::install/update
#------------------------------------------------------------------------------#
.PHONY: install
install: ## installs dependencies via bun
	@$(MAKE) MSG="install" LEN="-1" _init
	@$(BIN_BUN) $(_VFLG) install --save-text-lockfile
	@$(MAKE) MSG="install" LEN="-1" _done

.PHONY: update
update: ## updates dependencies
	@$(MAKE) MSG="update" LEN="-1" _init
	$(BIN_BUN) $(_VFLG) update --latest
	@$(MAKE) MSG="update" LEN="-1" _done

.PHONY: update_dry
update_dry: ## lists dependencies that would be updated via 'make update'
	@$(BIN_BUN) $(_VFLG) outdated


#------------------------------------------------------------------------------#
# @id::lint
# @docs: typescriptlang.org/docs/handbook/compiler-options.html
#      : eslint.org/docs/latest/use/command-line-interface
#------------------------------------------------------------------------------#
.PHONY: lint
lint: ## lints via tsc & eslint
	@$(MAKE) MSG="lint" LEN="-1" _init
	@$(MAKE) lint_tsc || exit 1
	@$(MAKE) lint_eslint || exit 1

.PHONY: _lint_eslint_factory
_lint_eslint_factory: # internal eslint factory
	@$(BIN)/eslint $(_EFLG) \
	$$([ "$(BAIL)" = "1" ] && echo " --max-warnings=0 --exit-on-fatal-error" || echo "") \
	--config $(ESL) \
	--cache \
	"$(SRC)/" && $(MAKE) COLOR="1;92" LEN="0" MSG="[PASS] lint_eslint" _pretty_printer

.PHONY: lint_eslint
lint_eslint: ## lints via eslint
	@$(MAKE) LEN="0" MSG="lint_eslint" _init
	@$(MAKE) _lint_eslint_factory \
		|| { [ "$(BAIL)" = "1" ] && $(MAKE) MSG="lint_eslint - target (lint_eslint) failed..." _erro; exit 1; }

.PHONY: lint_eslint_fix
lint_eslint_fix: ## lints and auto-fixes via eslint --fix
	@$(MAKE) LEN="0" MSG="lint_eslint_fix" _init
	@$(MAKE) _EFLG="--fix" _lint_eslint_factory

.PHONY: lint_tsc
lint_tsc: ## lints via tsc
	@$(MAKE) LEN="0" MSG="lint_tsc" _init
	@$(BIN)/tsc $(_WFLG) --noEmit --pretty --project "$(CURDIR)/tsconfig.json" && \
		$(MAKE) COLOR="1;92" LEN="0" MSG="[PASS] lint_tsc" _pretty_printer \
		|| { [ "$(BAIL)" = "1" ] && $(MAKE) MSG="lint_tsc - target (lint_tsc) failed..." _erro; exit 1; }

.PHONY: lint_watch
lint_watch: ## lints via eslint & tsc with fs.watch to continuously lint on change
	@$(MAKE) MSG="lint_watch" LEN="-1" _init
	@$(MAKE) lint
	@echo "require('fs').watch('$(SRC)',{recursive:true},(e,t)=>(globalThis.t?clearTimeout(globalThis.t):0,globalThis.t=setTimeout(()=>Bun.spawnSync(['make', 'lint'], {stdout: 'inherit', stderr: 'inherit'}),1000)))" \
		| $(BIN_BUN) run -


#------------------------------------------------------------------------------#
# @id::test
#------------------------------------------------------------------------------#
.PHONY: test
test: ## runs bun test(s)
	@$(MAKE) MSG="test" _init
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" TEST="1" _BFLG="--timeout 60000" _bun_factory

.PHONY: test_watch
test_watch: ## runs bun test(s) in watch mode
	@$(MAKE) MSG="test" _init
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" TEST="1" BAIL="0" WATCH="1" _bun_factory

.PHONY: test_update
test_update: ## runs bun test --update-snapshots
	@$(MAKE) MSG="test_update" _init
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" TEST="1" _BFLG="--update-snapshots" _bun_factory


#------------------------------------------------------------------------------#
# @id::helpers
#------------------------------------------------------------------------------#
# color via assignment operator '!='' to execute a shell/resolve at make parse
# > CR=reset FW=fg-white-bold FD=fg-white-dim FC=fg-cyan FY=fg-yellow FB=fg-blue BW=bg-white-bold
CR != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[0m"
FW != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[1;37m"
FD != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[2;37m"
FC != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[0;36m"
FY != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[0;33m"
FB != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[0;94m"
BW != { [ "$(NO_COLOR)" = "1" ] && echo ""; } || echo "\033[1;30;47m"
NL = \n# new line (helps read-ability)

.PHONY: help
help: ## displays (this) help screen
	@printf "$(BW)#$(CR)$(FW) USAGE$(CR) $(FD)($$(npm pkg get name | tr -d '"')/v$$(npm pkg get version | tr -d '"'))$(CR)$(NL)"
	@printf "   $(FC)make$(CR) $(FY)[flags...]$(CR) $(FB)<target>$(CR)$(NL)$(NL)"
	@printf "$(BW)#$(CR)$(FW) TARGET$(CR)$(NL)"
	@$(BIN_AWK) --posix '/^# *@id::/ { printf "$(FD)  -------------------$(CR)$(NL)"  } \
	/^[A-Za-z0-9_ -]*:.*##.*$$/ { \
		target = $$1; gsub(/:.*/, "", target); \
		desc   = $$0; gsub(/^[^#]*##[[:space:]]*/, "", desc); \
		printf "   $(FB)%-22s$(CR)%s$(NL)", target, desc \
	}' $(MKFILE)
	@printf "$(NL)$(BW)#$(CR)$(FW) FLAGS$(CR)$(NL)"
	@$(BIN_AWK) --posix '/^#: / { printf "$(FD)  -------------------$(CR)$(NL)"  } \
	/^#!/ { comment = substr($$0, 3); } \
	comment && /^[a-zA-Z][a-zA-Z0-9_-]+ ?\?=/ { \
		printf "   $(FY)%-21s$(CR)%s$(NL)", $$1, comment; \
	}' $(MKFILE)

.PHONY: _pretty_printer
_pretty_printer: # pretty printer (tr, could be better opt, need to look at os support)
	@LEN=$${LEN:-46}; \
	[ "$${QUIET:-0}" -ne 0 ] && exit 0 || [ "$${WATCH:-0}" -eq 1 ] && exit 0; \
	[ "$$LEN" -eq -1 ] && LEN=$(TMCOLS); \
	[ "$(TMCOLS)" -eq 0 ] && LEN=0; \
	CC="$$([ "$(NO_COLOR)" = "1" ] && echo "" || echo "\033[$${COLOR:-34}m")"; \
	CL=$$(i=0; while [ $$i -lt $$LEN ]; do printf "%s" "$${SYM:--}"; i=$$((i+1)); done); \
	LL=$$([ "$$LEN" -ne 0 ] && echo "$(NL)" || echo ""); \
	printf "$${LL}$${CC}%s$(CR)$${LL}$${CC}%s$(CR)$${LL}$${CC}%s$(CR)$(NL)" "$${CL}" "$(MSG)" "$${CL}";
.PHONY: _erro
_erro:
	@$(MAKE) COLOR="1;31" MSG="[ERRO] $(MSG)" SYM="*" LEN="-1" _pretty_printer
.PHONY: _init
_init:
	@$(MAKE) MSG="[INIT] $(MSG)" _pretty_printer
.PHONY: _done
_done:
	@$(MAKE) COLOR="1;92" MSG="[DONE] $(MSG)" _pretty_printer
