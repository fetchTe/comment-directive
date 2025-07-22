export type CommentRegexN = [start: null, end: null];
export type CommentRegexP = [start: RegExp, end: null];
export type CommentRegexF = [start: RegExp, end: RegExp];
export type CommentRegexSingle = CommentRegexP | CommentRegexF;
export type CommentRegexMulti = CommentRegexP | CommentRegexF;
export type CommentRegexOption = {
  single: CommentRegexP | CommentRegexF;
  multi: CommentRegexN | CommentRegexF;
};

// single
export const cLikeSingle: CommentRegexP = [/\s*\/\/\s*/, null];
export const hashLikeSingle: CommentRegexP = [/\s*#\s*/, null];
export const erlangSingle: CommentRegexP = [/\s*%\s*/, null];
export const sqlSingle: CommentRegexP = [/\s*--\s+/, null];
export const lispSingle: CommentRegexP = [/\s*;\s*/, null];
// multi
export const parensMulti: CommentRegexF = [/\s*\(\*/, /\*\)\s*/];
export const cLikeMulti: CommentRegexF = [/\s*\/\*/, /\*\/\s*/];
export const htmlMulti: CommentRegexF = [/\s*<!--/, /-->\s*/];
export const jsxMulti: CommentRegexF = [/\s*\{\/\*/, /\*\/\}\s*/];
export const lispMulti: CommentRegexF = [/\s*#\|/, /\|#\s*/];

// c-like
export const cLike: CommentRegexOption = {
  single: cLikeSingle,
  // eating the space before the comment makes it easier to work with inline-comments
  multi: cLikeMulti,
};
export const js = cLike;
export const ts = cLike;
export const c = cLike;
export const rust = cLike;
export const go = cLike;
export const swift = cLike;
export const kotlin = cLike;
export const groovy = cLike;
export const scala = cLike;

// c-like but with no single-line comment syntax
export const css: CommentRegexOption = {
  single: cLikeMulti,
  multi: cLikeMulti,
};


// hash-like
/* ******************************************************************** @example
# single line comment
# (no standard multi-line syntax for most hash-like languages)
***************************************************************************** */
export const hashLike: CommentRegexOption = {
  single: hashLikeSingle,
  multi: [null, null],
};
export const shell = hashLike;
export const elixir = hashLike;
export const make = hashLike;
export const yaml = hashLike;
export const toml = hashLike;
export const r = hashLike;
export const bash: CommentRegexOption = {
  single: hashLikeSingle,
  // heredocs are way too complex for a simple regex - but yolo
  multi: [/<<'EOF'/, /^EOF$/],
};


// python with docstrings
/* ******************************************************************** @example
# single line comment
"""
multi-line string/docstring
(acts as multi-line comment)
"""
***************************************************************************** */
export const python: CommentRegexOption = {
  single: hashLikeSingle,
  // explicit anchor to line start as trip quotes are not true multi-line comments
  multi: [/^\s*('''|""")/, /('''|""")/],
};


// ruby
/* ******************************************************************** @example
# single line comment
=begin
multi-line comment block
must start at beginning of line
=end
***************************************************************************** */
export const ruby: CommentRegexOption = {
  single: hashLikeSingle,
  // =begin and =end must be at the start of the line with no leading space
  multi: [/^=begin\b/, /^=end\b/],
};


// html/xml - no single-line comment syntax
/* ******************************************************************** @example
<!-- single line comment -->
<!--
multi-line comment
can span multiple lines
-->
***************************************************************************** */
export const html: CommentRegexOption = {
  single: htmlMulti,
  multi: htmlMulti,
};


// jsx - a field of landmines - use with extra care or not at all
// @example
//  {/* single+multi line JSX comment */}
export const jsx: CommentRegexOption = {
  single: jsxMulti,
  multi: jsxMulti,
};


// sql
/* ******************************************************************** @example
-- single line comment
*c-like multi-line comment style
***************************************************************************** */
export const sql: CommentRegexOption = {
  single: sqlSingle,
  multi: cLikeMulti,
};


// haskell
/* ******************************************************************** @example
-- single line comment
{-
multi-line comment
can be nested {- like this -}
-}
***************************************************************************** */
export const haskell: CommentRegexOption = {
  single: sqlSingle,
  multi: [/\s*\{-/, /-\}\s*/],
};


// powershell
/* ******************************************************************** @example
# single line comment
<#
multi-line comment
block style
#>
***************************************************************************** */
export const powershell: CommentRegexOption = {
  single: hashLikeSingle,
  // multi-line (block) comments use <# ... #>
  multi: [/\s*<#/, /#>\s*/],
};


// ini
/* ******************************************************************** @example
; single line comment
***************************************************************************** */
export const ini: CommentRegexOption = {
  // can also use '#' for comments?
  single: lispSingle,
  multi: [null, null],
};


// windows batch files
/* ******************************************************************** @example
REM single line comment
::  single line comment (un-offical)
***************************************************************************** */
export const bat: CommentRegexOption = {
  // REM (with a space) or :: for comments
  single: [/^\s*(?:REM\s|::)/i, null],
  multi: [null, null],
};


// erlang
/* ******************************************************************** @example
% single line comment
***************************************************************************** */
export const erlang: CommentRegexOption = {
  single: erlangSingle,
  multi: [null, null],
};


// lisp/racket comments
/* ******************************************************************** @example
; single line comment (semicolon)
#|
multi-line comment
using hash-pipe syntax
|#
***************************************************************************** */
export const lisp: CommentRegexOption = {
  single: lispSingle,
  multi: lispMulti,
};
export const racket = lisp;


// f# comments
/* ******************************************************************** @example
// single line comment
(*
multi-line comment
using ML-style syntax
*)
***************************************************************************** */
export const fsharp: CommentRegexOption = {
  single: cLikeSingle,
  multi: parensMulti,
};


// nim
/* ******************************************************************** @example
# single line comment
#|
multi-line comment
using hash-pipe syntax
|#
***************************************************************************** */
export const nim: CommentRegexOption = {
  single: hashLikeSingle,
  multi: lispMulti,
};


/* ******************************************************************** @example
// single line comment
***************************************************************************** */
export const zig: CommentRegexOption = {
  single: cLikeSingle,
  multi: [null, null],
};


// ocaml lacks a single comment format
/* ******************************************************************** @example
(* single-ish -> lacks a single comment format *)
(*
multi-line comment
using ML-style syntax
*)
***************************************************************************** */
export const ocaml: CommentRegexOption = {
  single: parensMulti,
  multi: parensMulti,
};


export const extensions = {
  // c-like
  js: js,
  ts: ts,
  c: c,
  h: c,
  cpp: c,
  cc: c,
  cxx: c,
  hpp: c,
  cs: c,
  rs: rust,
  go: go,
  swift: swift,
  kt: kotlin,
  kts: kotlin,
  groovy: groovy,
  scala: scala,

  jsx: jsx,
  tsx: jsx,

  // hash-like
  sh: shell,
  zsh: shell,
  elixir: elixir,
  ex: elixir,
  exs: elixir,
  make: make,
  mk: make,
  yaml: yaml,
  yml: yaml,
  toml: toml,
  r: r,
  bash: bash,

  // python
  py: python,

  // ruby
  rb: ruby,

  // CSS
  css: css,

  // HTML/XML
  html: html,
  htm: html,
  xml: html,

  // SQL
  sql: sql,

  // haskell
  hs: haskell,

  // powershell
  ps1: powershell,
  psm1: powershell,

  // INI
  ini: ini,
  conf: ini,
  cfg: ini,

  // windows batch
  bat: bat,
  cmd: bat,

  // erlang/matlab
  erl: erlang,
  hrl: erlang,

  // lisp/racket
  lisp: lisp,
  el: lisp,
  clj: lisp,
  cljs: lisp,
  cljc: lisp,
  racket: racket,
  rkt: racket,

  // F#
  fs: fsharp,
  fsx: fsharp,

  // nim
  nim: nim,

  // zig
  zig: zig,
};
