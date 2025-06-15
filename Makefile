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
# @id:filepath constants
#------------------------------------------------------------------------------#
# source dir
SRC = $(CURDIR)/src
# entrypoint
ENT = $(SRC)/index.ts $(SRC)/lang.ts
# build/output dir
DST = $(CURDIR)/dist
# test(s) (if not defined, recursive test search: bun.sh/docs/cli/test#run-tests)
TES = $(SRC)/index.test.ts $(SRC)/index.keep.test.ts $(SRC)/README.test.ts
# node/binaries (tsc, eslint)
NOM = $(CURDIR)/node_modules
BIN = $(NOM)/.bin
# eslint config
ESL = $(CURDIR)/eslint.config.mjs


#------------------------------------------------------------------------------#
# @id:flags (regardless of place/order, Make tenderly accepts all variable assignments)
#  > make LOG=1 target
#  > make target LOG=1
#  > LOG=1 make target
#    - a shell environment variable assignment that is passed to 'make';
#      persists throughout the entire invocation, including sub/recursive ones
#------------------------------------------------------------------------------#
#! [? ] bun build flag(s) (e.g: make BUN="--banner='// bake until golden brown'")
BUN ?=
#! [?0] build target env (-1=bun, 0=node, 1=dom, 2=dom+iife, 3=dom+iife+userscript)
TAR ?= 0
#! [?1] builds the cjs (common js) target on 'make build'
CJS ?= 1
#! [?1] builds minified (*.min.{mjs,cjs,js}) targets on 'make build'
MIN ?= 1
#! [?1] if set, tests will fail fast (bail) on the first error
BAIL ?= 1
#! [?0] sets the 'IS_TEST' static build variable (always 1 if the target is test*)
TEST ?= 0
#! [?0] sets the '--watch' flag for bun/tsc (e.g: WATCH=1 make test / WATCH=1 make lint_tsc)
WATCH ?= 0
#! [?0] enables verbose logging and sets the 'IS_DEBUG' static build variable
DEBUG ?= 0
#! [?1] pretty-prints/logs target (INIT/DONE) info
LOG ?= 1
#! [?0] disables color logging/ANSI codes
NO_COLOR ?= 0
#! [?mjs|js] default esm build extension
EXE ?= mjs
#! [?DEV|PROD|TEST] sets the 'ENV' and 'IS_*' static build variables
ENV ?= DEV

# GNUMAKEFLAGS is for flags that do not alter behavior, per the GNU scripture
GNUMAKEFLAGS += --no-print-directory


#------------------------------------------------------------------------------#
# @id:cross-os variable (assumes unix-y or msys2 on windows, if not, adjust accordingly)
#------------------------------------------------------------------------------#
_VFLG  = $$([ "$(DEBUG)" = "1" ] && echo " --verbose" || echo "")
BIN_BUN= bun
# required for help only; otherwise optional
BIN_AWK= awk
CMD_RM = rm -fr $(_VFLG)
CMD_CP = cp $(_VFLG)
CMD_MK = mkdir -p $(_VFLG)
DEVNUL = /dev/null
TMCOLS = $$(tput cols 2>$(DEVNUL) || echo 0)
# for non-GNU-y make implementations (pdpmake) that follow the POSIX standard
MKFILE = $$([ -z "$(MAKEFILE_LIST)" ] && echo "./Makefile" || echo "$(MAKEFILE_LIST)")


#------------------------------------------------------------------------------#
# @id:internal/build
#------------------------------------------------------------------------------#
# bun format
_BFMT = esm
# bun positional
_BPOS = build
# bun ext file/format
_BEXE = mjs
# bun output location
_BOUT =
# bun private/dynamic flags
_BFLG =
# bun build target
_BTAR = $$( { [ "$(TAR)" = "-1" ] && echo "bun" || { [ "$(TAR)" = "0" ] && echo "node" || echo "browser"; }; })
# bun .js build to target iife (acts as a conditional)
_BIIF != { [ "$(TAR)" = "2" ] || [ "$(TAR)" = "3" ] && echo "iife"; } || echo "esm"

# bun shared flags (*.*)
_BFLG_SHR =--packages=external --target=$(_BTAR)
# bun (lib) export flags (*.{js,cjs,mjs})
_BFLG_EXP=--sourcemap=none
# bun (min) export flags (*.min.{js,cjs,mjs})
_BFLG_MIN=--minify
# min logic for cjs/mjs
_MIN_CJS=$$([ "$(MIN)" = "0" ] && echo "0" || echo "$(CJS)")
# bail flag
_BAIL = $$([ "$(BAIL)" = "1" ] && echo " --bail" || echo "")
# watch flag
_WFLG = $$([ "$(WATCH)" = "1" ] && echo " --watch" || echo "")
# eslint flags
_EFLG =
# tsc flags
_TFLG =

# lazy conditionals; passed to factories to set flags dynamically
# @note: re-evaluated each time they're referenced in a target, rather than being
#        evaluated at first parsed, in javascript terms: $$(cmd) is like () => cmd
IS_DEV  = $$([ "$(ENV)" = "DEV" ]  && echo 1 || echo 0)
IS_PROD  = $$([ "$(ENV)" = "PROD" ]  && echo 1 || echo 0)
IS_TEST = $$([ "$(ENV)" = "TEST" ] && echo 1 || echo $(TEST))


#------------------------------------------------------------------------------#
# @id::all
#------------------------------------------------------------------------------#
.PHONY: all
all: ## clean, setup, build, lint, test, aok (the entire jamboree)
	@$(MAKE) MSG="release" LEN="-1" _init
	@# rm/mk/and build fresh with ENV="TEST"
	@$(MAKE) MSG="release:test" SYM="--" COLOR="1;36" _init
	@$(CMD_RM) "$(DST)" || true
	@$(CMD_MK) "$(DST)" || { $(MAKE) MSG="failed to create $(DST)" _erro; exit 1; }
	@# buid in prod with IS_TEST (skip min builds)
	@$(MAKE) ENV="PROD" TEST="1" MIN="0" _build_code_factory || { $(MAKE) MSG="build_code target failed... abort" _erro; exit 1; }
	@# lint es/ts (must run indv in order to exit properly)
	@$(MAKE) MSG="release:lint" SYM="--" COLOR="1;36" _init
	@$(MAKE) BAIL="1" lint_eslint || { $(MAKE) MSG="target lint_eslint failed..." _erro; exit 1; }
	@$(MAKE) BAIL="1" lint_tsc || { $(MAKE) MSG="target lint_tsc failed..." _erro; exit 1; }
	@# run tests (could also be run pre-lint if preferred)
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" ENV="TEST" _bun_factory
	@# everythings aok -> re-build with min builds and without IS_TEST
	@$(MAKE) MSG="release:build" SYM="--" COLOR="1;36" _init
	@$(CMD_RM) "$(DST)" || true
	@$(CMD_MK) "$(DST)" || { $(MAKE) MSG="failed to create $(DST)" _erro; exit 1; }
	@$(MAKE) ENV="PROD" TEST="0" MIN="$(MIN)" _build_code_factory
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

.PHONY: build_cjs
build_cjs:  ## builds the .cjs export
	@$(MAKE) _BFMT="cjs" _BEXE="cjs" _BFLG="$(_BFLG_EXP)" _bun_code_factory

.PHONY: build_cjs_min
build_cjs_min:  # builds the .min.cjs export
	@$(MAKE) _BFMT="cjs" _BEXE="min.cjs" _BFLG="$(_BFLG_MIN)" _bun_code_factory

.PHONY: build_esm
build_esm:  ## builds the .js (esm) export
	@$(MAKE) _BFMT="$(_BIIF)" _BEXE="$(EXE)" _BFLG="$(_BFLG_EXP)" _bun_code_factory

.PHONY: build_esm_min
build_esm_min:  # builds the .min.js (esm) export
	@$(MAKE) _BFMT="$(_BIIF)" _BEXE="min.$(EXE)" _BFLG="$(_BFLG_MIN)" _bun_code_factory

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
	@[ "$(DEBUG)" != "1" ] && true || echo " $(BIN_BUN) $(_VFLG) $(_BPOS) $(_BBIN) $(BUN) $(_BFLG_SHR) $(_BFLG) $(_WFLG) $(_BAIL) --define ENV="\"$(ENV)\"" --define IS_DEBUG="$(DEBUG)" --define IS_DEV="$(IS_DEV)" --define IS_FORMAT="\"$(_BFMT)\"" --define IS_PROD="$(IS_PROD)" --define IS_TEST="$(IS_TEST)" --define IS_WATCH="$(WATCH)" $(_BOUT)"
	@# flag priority -> last takes the cake
	@$(BIN_BUN) $(_VFLG) $(_BPOS) $(_BBIN) $(BUN) $(_BFLG_SHR) $(_BFLG) $(_WFLG) $(_BAIL) \
		--define ENV="\"$(ENV)\"" \
		--define IS_DEBUG="$(DEBUG)" \
		--define IS_DEV="$(IS_DEV)" \
		--define IS_FORMAT="\"$(_BFMT)\"" \
		--define IS_PROD="$(IS_PROD)" \
		--define IS_TEST="$(IS_TEST)" \
		--define IS_WATCH="$(WATCH)" \
		$(_BOUT)

.PHONY: _bun_code_factory
_bun_code_factory: # private bun code build (wrapper) factory
	@[ "$(_BIIF)" == "iife" ] && [ "$(_BIIF)" != "$(_BFMT)" ] && exit 0 || true
	@$(MAKE) _BOUT="--entrypoints $(ENT) --outdir \"$(DST)\" --entry-naming \"[dir]/[name].$(_BEXE)\" --format $(_BFMT)" _bun_factory


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
update_dry: ## list dependencies that would be updated via deps_update
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
	@$(MAKE) MSG="lint" LEN="-1" _done

.PHONY: _lint_eslint_factory
_lint_eslint_factory: # internal eslint factory
	@$(BIN)/eslint $(_EFLG) \
	$$([ "$(BAIL)" = "1" ] && echo " --max-warnings=0 --exit-on-fatal-error" || echo "") \
	--config $(ESL) \
	--cache \
	"$(SRC)/" && $(MAKE) COLOR="1;92" LEN="0" MSG="[PASS] eslint" _pretty_printer

.PHONY: lint_eslint
lint_eslint: ## lints via eslint
	@$(MAKE) MSG="lint_eslint" _init
	@$(MAKE) _lint_eslint_factory \
		|| { [ "$(BAIL)" = "1" ] && $(MAKE) MSG="eslint - target (lint_eslint) failed..." _erro; exit 1; }

.PHONY: lint_eslint_fix
lint_eslint_fix: ## lints and auto-fixes via eslint --fix
	@$(MAKE) MSG="lint_eslint_fix" _init
	@$(MAKE) _EFLG="--fix" _lint_eslint_factory

.PHONY: lint_tsc
lint_tsc: ## lints via tsc
	@$(MAKE) MSG="lint_tsc" _init
	@$(BIN)/tsc $(_WFLG) --noEmit --pretty --project "$(CURDIR)/tsconfig.json" && \
		$(MAKE) COLOR="1;92" LEN="0" MSG="[PASS] tsc" _pretty_printer \
		|| { [ "$(BAIL)" = "1" ] && $(MAKE) MSG="tsc - target (lint_tsc) failed..." _erro; exit 1; }


#------------------------------------------------------------------------------#
# @id::test
#------------------------------------------------------------------------------#
.PHONY: test
test: ## runs bun test(s)
	@$(MAKE) MSG="test" _init
	@$(MAKE) _BPOS="test" _BOUT="$(TES)" TEST="1" _bun_factory

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
	@printf "$(BW)#$(CR)$(FW) USAGE$(CR)$(NL)"
	@printf "   $(FC)make$(CR) $(FY)[flags...]$(CR) $(FB)<target>$(CR)$(NL)$(NL)"
	@printf "$(BW)#$(CR)$(FW) TARGET$(CR)$(NL)"
	@$(BIN_AWK) --posix '/^# *@id::/ { printf "$(FD)  -------------------$(CR)$(NL)"  } \
	/^[A-Za-z0-9_ -]*:.*##.*$$/ { \
		target = $$1; gsub(/:.*/, "", target); \
		desc   = $$0; gsub(/^[^#]*##[[:space:]]*/, "", desc); \
		printf "   $(FB)%-22s$(CR)%s$(NL)", target, desc \
	}' $(MKFILE)
	@printf "$(NL)$(BW)#$(CR)$(FW) FLAGS$(CR)$(NL)"
	@$(BIN_AWK) --posix '/^#!/ { comment = substr($$0, 3); } \
	comment && /^[a-zA-Z][a-zA-Z0-9_-]+ ?\?=/ { \
		printf "   $(FY)%-21s$(CR)%s$(NL)", $$1, comment; \
	}' $(MKFILE)


.PHONY: _pretty_printer
_pretty_printer: # pretty printer (tr, could be better opt, need to look at os support)
	@LEN=$${LEN:-46}; \
	[ "$${LOG:-1}" -eq 0 ] && exit 0 || [ "$${WATCH:-0}" -eq 1 ] && exit 0; \
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
