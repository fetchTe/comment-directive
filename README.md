# `comment-directive`

A brutally effective text preprocessor that uses comments as conditional directives. No need for separate `.template` files, no overly complicated DSL; just comments that do useful work.

> Well-tested, isomorphic, dependency-free, slices and dices lines: ~300/µs, ~3,000/ms, and ~3,000,000/s;<br/>
> But, as with anything [`RegExp`](https://en.wikipedia.org/wiki/Regular_expression), it's more like a well-oiled [ice sculpture](https://en.wikipedia.org/wiki/Ice_sculpture) chainsaw than a surgical blade



## QuickStart

```ts
import commentDirective from 'comment-directive';

const input = `
// ###[IF]env=1;rm=comment;un=comment;
// console.log('if env=1, remove me; else, un-comment me');

// ###[IF]env=1;rm=line;sed=/surgical blade/chainsaw/;
const aWellOiled = "surgical blade";`;

commentDirective(input, {env: 1}).trim() === ``;
commentDirective(input, {env: 0}) === `
console.log('if env=1, remove me; else, un-comment me');

const aWellOiled = "chainsaw";`;
```

```ts
/* @INPUT
For example, replacing a string with an ENV variable is easy;
Injecting an object function into an argument with an ENV variable, not so easy
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]prod=1;un=comment;rm=comment;
const anExample = (arg = [1, /* {aFn: () => ['aHotArray']}, */ 2, 3]) => {
  // ###[IF]prod=0;sed=/80/3000/;
  // ###[IF]prod=1;sed=/localhost/api.fun/;
  const str = 'https://localhost:80'
  return {str, arg};
};


/* @IF prod=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
const anExample = (arg = [1, {aFn: () => ['aHotArray']}, 2, 3]) => {
  const str = 'https://api.fun:80'
  return {str, arg};
};


/* @IF prod=0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
const anExample = (arg = [1, 2, 3]) => {
  const str = 'https://localhost:3000'
  return {str, arg};
};
```


#### ▎INSTALL

```sh
# pick your poison
npm install --save-dev comment-directive
bun  add --dev comment-directive
pnpm add --save-dev comment-directive
yarn add --dev comment-directive
```
<br/>



## API

```ts
function commentDirective(
  template: string, // template string to process
  flags: Record<string, boolean | number | string>, // condition flags
  options?: Partial<CommentOptions> // comment option/format
): string;

type CommentOptions = {
  // id/match options
  delimiter?: string;       // sed and sequence delimiter (default: '/')
  identifier?: string;      // comment directive identifier (default: '###[IF]')
  // parse options
  escape?: boolean;         // escape regex patterns to match literal strings (default: true)
  loose?: boolean;          // allow directives on lines with other content (default: false)
  nested?: boolean;         // allow nested multi-line comments (default: false)
  disableCache?: boolean,   // if memory is a concern in absurd/extreme use cases (default: false)
  throw?: boolean;          // throw on any error instead of logging and ignoring (default: false)
  // keep/preserve options
  keepDirective?: boolean;  // keep comment directive in output (default: false)
  keepEmpty?: boolean;      // keep/preserve removed empty comments/lines (default: false)
  // keepPad* -> false=none; true=both; 1=single-only; 2=multi-only
  keepPadStart?: boolean | 1 | 2, // start/leading whitespace for un/rm-comment (default: true)
  keepPadIn?: boolean | 1 | 2,    // inside whitespace for un/rm-comment (default: 2)
  keepPadEnd?: boolean | 1 | 2,   // end whitespace for un/rm-comment (default: 2)
  keepPadEmpty?: boolean | 1 | 2, // empty-line whitespace-only for un/rm-comment (default: false) 
  // 'fn' action/comment directive consumer (default: I => I)
  fn?: (input: (string | number)[], id: string, idx: number)=> (string | number)[];
  // regex comment/language support options
  multi?: [start: RegExp | string, end: RegExp | string];
  single?: [start: RegExp | string, end?: null | RegExp | string];
};
```
> [!IMPORTANT]
> [Defaults](#default) to C-like `//` and `/* */` comments, but can be customized to suit any [language](#language-support);<br />
> **NOTE**: it's not a full-fledged parser and has inherent [limitations](#limitations)<br />
<br/>



## Directive Syntax

> Defined using the single-line comment format on its own line, unless [`loose`](#loose) is enabled

```erlang
<comment_start> ###[IF]condition;action_if_true;[action_if_false;] [<comment_end>]
```

```ts
/* @example one-way directive: 'if' env=prod -> 'then' replace '3000' with '80' */
// ###[IF]env=prod;sed=/3000/80/;
const port = 3000;


/* @example two-way directive: 'if' env=prod -> 'then' uncomment -> 'else' remove */
// ###[IF]env=prod;un=comment;rm=comment;
// console.log('ENV: production');
```
<br/>



## Directive Actions

Directives are executed top-to-bottom and can be "[stacked](#stacked)" on top of one another.


#### ▎`rm=<N>L`
Removes the next `N` lines, such as `rm=3L` removes the next 3 lines:


```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]env=yaffle;rm=2L;
debug('removes the');
debug('de-bug(s)');
warn('but not this warn');


/* @IF env=yaffle ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
warn('but not this warn');


/* @IF env=dazzle ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
debug('removes the');
debug('de-bug(s)');
warn('but not this warn');
```
<br/>


#### ▎`(rm|un)=comment`
Removes or uncomments the next comment block it finds, whether single-line, multi-line, or inline:

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]prod=1;rm=comment;un=comment;
/*
debug('debug all');
debug('the bugs');
*/
// another comment


/* @IF prod=1 (rm) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

// another comment


/* @IF prod=0 (un) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

debug('debug all');
debug('the bugs');
// another comment
```
<br/>


#### ▎`fn=<id>/[<N>L][@<stop>]`
The `fn` directive, along with the matching `fn` [option](#api) function, offers a way to override the output of the next line, a span of `<N>` lines, or up to `@<stop>`. Basically, an escape hatch for custom logic.

```ts
const input = `
// ###[IF]dist=1;fn=distTo;fn=distFrom;
import { commentDirective } from './index.ts';
import { type CommentOptions } from './index.ts';`;

type FnAction = (input: (string | number)[], id: string, idx: number)=> (string | number)[];
const fn: FnAction = (input, id, _idx) => input.map(line => {
  if (id === 'distTo') {
    return String(line).replace(`'./`, `'../dist/`).replace('.ts', '.js');
  }
  if (id === 'distFrom') {
    return String(line).replace('../dist/', './').replace('.js', '.ts');
  }
  return line;
});

const options = {keepDirective: true, fn};
const once    = commentDirective(input, {dist: 1}, options);
const twice   = commentDirective(once,  {dist: 1}, options);
const thrice  = commentDirective(twice, {dist: 0}, options);

// thrice undoes twice and matches the original input
let isTrue = input === thrice;
// twice matches once, i.e: it didn't re-change the code
isTrue = once === twice && twice === `
// ###[IF]dist=1;fn=distTo;fn=distFrom;
import { commentDirective } from '../dist/index.js';
import { type CommentOptions } from './index.ts';`;
```
<br/>


#### ▎`sed=/pattern/replacement/[flags][<N>L][@<stop>]`
Text replacement and/or substitution, it's [`sed`](https://en.wikipedia.org/wiki/Sed)-like, in RegExp's clothing. All patterns are escaped to match literal strings; to use actual `RegExp` syntax, the [`escape`](#escape) option must be set.

+ `pattern    `: search pattern; treated as literal string with characters escaped; see [escape](#escape) below
+ `replacement`: `pattern` replacement; supports substitution groups like `$1`, if you live dangerously
+ `[flags]    `: *(optional)* standard regex flags: `g`, `i`, `m`, `u`, `y`, `s`
+ `[<N>L]     `: *(optional)* limits the action to the next `N` lines
+ `[@<stop>]  `: *(optional)* processes lines until the `<stop>` marker (e.g: `@//#STOP`)


#### ⎸`<N>L`

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]boat=1;sed=/log/debug/2L;
log('test');
log('the');
log('best');


/* @IF boat=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
debug('test');
debug('the');
log('best');
```


#### ⎸`@<stop>`

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]goat=1;sed=/log/debug/@//#STOP;
log('test');
log('the');
//#STOP
log('best');


/* @IF goat=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
debug('test');
debug('the');
//#STOP
log('best');
```


#### ⎸`/global/flag/g`
The global `g` flag applies to all content below the directive during the preliminary pass, **before** any other line-by-line directives. Use it sparingly; better yet, avoid it entirely, or at minimum, use a limit via `<N>L`:

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
LOG('test');
// ###[IF]jolt=1;sed=/log/debug/gi;
LOG('the');
LOG('best');
LOG('log');


/* @IF jolt=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
LOG('test');
debug('the');
debug('best');
debug('debug');
```
> **NOTE**: `@<stop>` does not work with `g`

<br/>


#### ▎SEQUENCE
Sequence actions add or remove a given `<value>` to the next line, `<N>` lines, or until `@<stop>`; a simpler, saner alternative to [`sed`](#sedpatternreplacementflagsnlstop) for commenting out code.

+ `prepend|unshift`: adds `<value>` to the beginning of line(s)
+ `append|push    `: adds `<value>` to the end of line(s)
+ `shift          `: removes `<value>` from the beginning of line(s)
+ `pop            `: removes `<value>` from the end of line(s)


#### ⎸`(append|prepend|push|unshift)=<value>/[<N>L][@<stop>]`

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]bolt=1;prepend=// /4L;
// ###[IF]bolt=1;append=/* app-ended */ /@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP


/* @IF bolt=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]bolt=1;prepend=// /4L;
// ###[IF]bolt=1;append= /* app-ended *//@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */ 
//   return 2 ** fac; /* app-ended */ 
// }; /* app-ended */ 
// //#STOP /* app-ended */ 
```
> To remove the trailing space in `/* app-ended */ ` you could use: `/* app-ended *///@//#STOP;` <br/>
> Or use a different delimiter like `^` to write: `/* app-ended */^@//#STOP;`


#### ⎸`(shift|pop)=<value>/[<N>L][@<stop>]`

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]volt=1;shift=// /4L;
// ###[IF]volt=1;pop= /* app-ended */ /@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */ 
//   return 2 ** fac; /* app-ended */ 
// }; /* app-ended */ 
// //#STOP /* app-ended */ 


/* @IF volt=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]volt=1;shift=// /4L;
// ###[IF]volt=1;pop= /* app-ended *//@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP
```


#### ⎸NonDestructive
If [`keepDirective`](#keepdirective) is set, sequence actions are nondestructive and can be restored to their original state:

```ts
const input = `
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
log('nondestructive');
log('reversible');`;
const once   = commentDirective(input, {prod: 1}, {keepDirective: true});
const twice  = commentDirective(once,  {prod: 1}, {keepDirective: true});
const thrice = commentDirective(twice, {prod: 0}, {keepDirective: true});

// thrice undoes twice and matches the original input
let isTrue = input === thrice;
// twice matches once, i.e: it didn't re-comment the code
isTrue = once === twice && twice === `
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
// log('nondestructive');
// log('reversible');` && twice !== input;
```
<br/>



## Stacked
Stacked directives are processed in order against the first non-directive content below them:

```ts
const input = `
// ###[IF]opt=1;un=comment;
// ###[IF]alt=2;sed=/vegetable/protein/;
// ###[IF]cat=0;sed=/stack/hack/;
// let vegetable = 'stack';`.trim();

commentDirective(input, {opt: 0}) === "// let vegetable = 'stack';";
commentDirective(input, {opt: 1}) === "let vegetable = 'stack';";
commentDirective(input, {opt: 1, alt: 2}) === "let protein = 'stack';";
commentDirective(input, {cat: 0, alt: 2}) === "// let protein = 'hack';";
```

The first directive result becomes the input for the second, and so on, allowing for any manner of nonsense:

```ts
commentDirective(`
// ###[IF]stacked=1;sed=/aaa/bbb/;
// ###[IF]stacked=1;sed=/bbb/ccc/;
aaa
`.trim(), {stacked: 1}) === "ccc";

commentDirective(`
// ###[IF]stacked=1;un=comment;
/*
// ###[IF]stacked=1;un=comment;
// ###[IF]stacked=1;sed=/foolery/foolery works!/;
// let like = 'even this kind of tomfoolery';
*/
`.trim(), {stacked: 1}) === "let like = 'even this kind of tomfoolery works!';";

commentDirective(`
// ###[IF]srsly=1;sed=/the quick/brown fox/;
// ###[IF]srsly=1;sed=/brown fox/jumps over/;
// ###[IF]srsly=1;sed=/jumps over/the lazy dog/;
brown fox jumps over the the quick
`.trim(), {srsly: 1}) === "the lazy dog jumps over the brown fox";
```
<br/>



## Language Support
*If you can RegExp-it, you can `comment-directive` it!*


#### ▎DEFAULT

```ts
// ./src/lang.ts -> exports a handful of language RegExp definitions
import {
  css,
  html,
  python,
  make,
  extensions, // all langs by extension, e.g: extensions.nim, *.rb, *.py, *.toml
} from 'comment-directive/lang';


// default c-like comment format (js/ts/c/rust/go/swift/kotlin/scala)
const DEFAULT_OPTIONS: CommentOptions = {
  // regex comment/language support options
  multi: [/\s*\/\*/, /\*\/\s*/],
  single: [/\s*\/\/\s*/, null], // eating the surrounding space simplifies alignment
  // id/match options
  delimiter: '/',        // sed and sequence actions delimiter (default: '/')
  identifier: '###[IF]', // comment directive identifier (default: '###[IF]')
  // parse options
  escape: true,          // escape regex patterns to match literal strings (default: true)
  loose: false,          // allow directives on lines with other content (default: false)
  nested: false,         // allow nested multi-line comments (default: false)
  disableCache: false,   // if memory is a concern in absurd/extreme use cases (default: false)
  throw: false,          // throw on any error instead of logging and ignoring (default: false) 
  // keep/preserve options
  keepDirective: false,  // keep comment directive in output (default: false)
  keepEmpty: false,      // keep/preserve removed empty comments/lines (default: false)
  // keepPad* ->  false=none; true=both; 1=single only; 2=multi only
  keepPadStart: true,    // start/leading whitespace for un/rm-comment (default: true)
  keepPadIn: 2,          // inside whitespace for un/rm-comment (default: 2)
  keepPadEnd: 2,         // end whitespace for un/rm-comment (default: 2)
  keepPadEmpty: false,   // empty-line whitespace-only for un/rm-comment (default: false) 
  fn: (input, _id, _idx) => input, // 'fn' comment directive consumer
};
```


#### ▎PYTHON

```ts
const canPython = commentDirective(`
# ###[IF]python=1;un=comment;
# print('python may be for thee, but not for me')
# ###[IF]python=1;un=comment;
'''
print('python may be for thee, but not for me')
'''
# ###[IF]python=1;un=comment;
"""
print('python may be for thee, but not for me')
"""`, { python: 1 }, {
  single: [/#\s*/, null],
  // explicit anchor to line start as trip quotes aren't true multi-line comments
  multi: [/^\s*('''|""")/, /('''|""")/],
}).split('\n').filter(Boolean).join('\n') === `
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')`.trim();
```


#### ▎HTML

```ts
const canHTML = commentDirective(`
<!-- ###[IF]doyou=html;un=comment; -->
<!-- ###[IF]doyou=html;sed=/yes.js/ido.js/; -->
<!-- <script src="yes.js"></script> -->`, { doyou: 'html' }, {
  multi: [/<!--/, /-->/],
  // no single-line comment syntax; explicit start/end anchors; safety first
  single: [/^\s*<!--\s*/, /\s*-->\s*$/],
}).trim() === '<script src="ido.js"></script>';
```
<br/>



## Options

#### ▎`delimiter`
Changes the default delimiter (`'/'`) for both [`sed`](#sedpatternreplacementflagsnlstop) and [sequence](#sequence) actions:

```ts
commentDirective(`
// ###[IF]reg=1;sed=%s://a.super/long/path%://z.super/dup/er/long/path%;
'https://a.super/long/path';
`.trim(), {reg: 1}, {delimiter: '%'}) === "'http://z.super/dup/er/long/path';";

commentDirective(`
// ###[IF]reg=1;sed=###/###+###;
let maths = 1 / 2 / 3;
`.trim(), {reg: 1}, {delimiter: '###'}) === "let maths = 1 + 2 / 3;";

// but, yo, i want to replace all '/' to '+'
commentDirective(`
// ###[IF]reg=1;sed=###/###+###g1L;
let maths  = 1 / 2 / 3;
let mathss = 1 / 2 / 3;`, {reg: 1}, {delimiter: '###'})
// done
=== `
let maths  = 1 + 2 + 3;
let mathss = 1 / 2 / 3;`;
```
<br />


#### ▎`escape`
Set `escape: false` to use actual `RegExp` syntax in patterns:

```ts
commentDirective(`
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123
`.trim(), {reg: 1}, {escape: false}) === "456";
```
<br />


#### ▎`identifier`
Changes the `'###[IF]'` comment directive identifier:

```ts
commentDirective(`
// @@@[VROOOOOOOOOM]too=fast;rm=line;
console.log('web fast');`, {
  too: 'fast'
}, {identifier: '@@@[VROOOOOOOOOM]'}).trim() === "";
```
<br />


#### ▎`loose`
Comment directives must be on their own line, but `loose` disables this restriction:

```ts
const result = commentDirective(`
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');`, {loosey: 'goosey'}, {loose: true});

/* @loose=false (default) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');


/* @loose=true ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
console.log('willy');
console.log('nilly');
// a directive always targets the line below
console.log('i stay');
//
```

If you like to play fast and `loose`, you can also stack directives:

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]loose=1;sed=/log/play/;
// ###[IF]loose=1;sed=/super/fast/;
loging('super'); // ###[IF]loose=1;sed=/loging/and/;
loging('loose');

/* @loose=true ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
playing('fast');
and('loose');
```
<br />


#### ▎`keepDirective`
Keep comment directives in the output, purged by default:

```ts
const result = commentDirective(`
// ###[IF]nap=1;un=comment;
// console.log('what about the comments?');`, {nap: 1}, {keepDirective: false});

/* @keepDirective=false (default) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

console.log('what about the comments?');


/* @keepDirective=true ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]nap=1;un=comment;
console.log('what about the comments?');
```
<br />


#### ▎`keepEmpty`
Keep empty lines and directives in the output, vanquished by default:

```ts
const result = commentDirective(`
// #######################################
// ###[IF]empty=me;rm=comment;
/*
console.debug('take anything but');
console.debug('my whitespace');
*/
// #######################################`, {empty: 'me'}, {keepEmpty: false});

/* @keepEmpty=false (default) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

// #######################################
// #######################################


/* @keepEmpty=true ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

// #######################################





// #######################################
```
<br />


#### ▎`keepPad*`
The `keepPad*` options control how whitespace `\s*` is handled by `(un|rm)=comment` with the values of:

+ `false` - whitespace is removed
+ `true ` - whitespace is kept for both `single` and `multi`
+ `1    ` - whitespace is kept for `single` only
+ `2    ` - whitespace is kept for `multi` only


#### ⎸SYNTAX DEFINITIONS
The behavior of `keepPad*` revolves around how whitespace is consumed/defined within the `RegExp`:

```
# single: [/\s*\/\/\s*/, null]
  <keepPadStart>  //  <keepPadIn>  text

# single: [/\s*\/\//, null]
  <keepPadStart>  //   text

# multi: [/\s*\/\*\s*/, /\s*\*\/\s*/]
  <keepPadStart>  /*  <keepPadIn>  text  <keepPadIn>  */   <keepPadEnd>

# multi: [/\s*\/\*/, /\*\//]
  <keepPadStart>  /*   text   */

# any (if whitespace-only empty-line)
      <keepEmpty>       
```


#### ⎸EXAMPLE

```ts
const whitespace = ' '.repeat(10);
const input = `
    // ###[IF]space=1;un=comment;
    // let space = 'keep';${whitespace}
    // ###[IF]space=1;un=comment;
  1 /*${whitespace}
    let keep = 'space';${whitespace}
    */${whitespace}`;

commentDirective(input, {space: 1}, {
  keepPadEmpty: true, // keeps last empty line of whitespace
  multi: [/\s*\/\*\s*/, /\s*\*\/\s*/],
}).replaceAll(' ', '⠐') === `
⠐⠐⠐⠐let⠐space⠐=⠐'keep';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐1⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐let⠐keep⠐=⠐'space';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐`);

commentDirective(input, {space: 1}, {
  keepPadIn: false,
  keepPadStart: false,
  keepPadEnd: false,
  multi: [/\s*\/\*\s*/, /\s*\*\/\s*/],
}).replaceAll(' ', '⠐') === `
let⠐space⠐=⠐'keep';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐1
⠐⠐⠐⠐let⠐keep⠐=⠐'space';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐\n`);
```
<br/>


#### ▎`nested`
Nested comments are permitted in kool-kid languages such as Rust, D, Nim, Scala, Kotlin, Haskell, and F#, but hopefully, you will never have to deal with such a desecration of natural law:

```ts
commentDirective(`
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;sed=/details/Nested Comments/i;
/* /* /* /* /* The Devil's in the Details */ */ */ */ */`, {
  nested: 1
}, {nested: true}).trim() === "/* /* The Devil's in the Nested Comments */ */";
```
<br/>



## Raw Regex Hackin'

Since you can't shoehorn [PEG](https://en.wikipedia.org/wiki/Parsing_expression_grammar) logic into a comment, this library isn't intended for complex operations, but sometimes brandishing a crude `RegExp` chainsaw is unavoidable:

```ts
commentDirective(str, {rexy: 1}, {
  keepDirective: true, // prevents comment directive from being removed
  delimiter: '##',     // changes sed delimiter from '/' to '##'
  escape: false,       // disables string escape (needed to use regex)
});
```
> **NOTE**: the [sequence](#sequence) directive is designed for commenting out code, but this makes for a good example

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};


/* @IF rexy=1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
// const myKoolFunction = (arg = 'logic'): number => {
//   const res = 'big ' + arg;
// 
//   return res.length;
// };
// //#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
```

Let's take that the output of `rexy=1` and reverse it with `rexy=0`:

```ts
/* @INPUT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
// const myKoolFunction = (arg = 'logic'): number => {
//   const res = 'big ' + arg;
// 
//   return res.length;
// };
// //#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};

/* @IF rexy=0 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
```

Voila! A block of code that you can toggle on and off by flipping a `rexy` flag with an elegant `RegExp` chainsaw. Use it sparingly, otherwise you might hack the 'i' out of 'eye'.

```
# The above comment directive broken down

[IF]rexy=0  (comments out myKoolFunction)
  sed=
    match  : ^(?!\\/\\/\\s)(.*)   - matches any line except those that start with '// '
    replace: // $1                - uses substitution to add comments
    stop-at: //#STOP              - stops matching lines at '//#STOP'

[IF]rexy=1  (uncomments myKoolFunction)
  sed=
    match  : ^(\\/\\/\\s)(.*)     - matches any line that starts with '// '
    replace: $2                   - uses substitution to remove comments
    stop-at: //#STOP              - stops matching lines at '//#STOP'

NOTE: alternatively, you could use the if/else syntax like so:
// ###[IF]rexy=0;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
```
<br/>



## Limitations

[RegExp](https://en.wikipedia.org/wiki/Regular_expression).
<br/>
<br/>



## Development/Contributing

Contributions, pull requests, and suggestions are appreciated. First, make sure you have installed and configured the required build dependencies: [Bun](https://bun.sh) and [Make](https://www.gnu.org/software/make/manual/make.html). 


#### ▎PULL REQUEST STEPS

1. Commit your changes/code
2. Run `make` to clean, setup, build, lint, and test
3. Assuming everything checks out, push your branch to the repository, and submit a pull request


#### ▎MAKEFILE REFERENCE

```
# USAGE
   make [flags...] <target>

# TARGET
  -------------------
   all                   clean, setup, build, lint, test, aok (the entire jamboree)
  -------------------
   build                 builds the .{js,d.ts} (skips: lint, test, and .min.* build)
   build_cjs             builds the .cjs export
   build_esm             builds the .js (esm) export
   build_declarations    builds typescript .d.{ts,mts,cts} declarations
  -------------------
   install               installs dependencies via bun
   update                updates dependencies
   update_dry            list dependencies that would be updated via deps_update
  -------------------
   lint                  lints via tsc & eslint
   lint_eslint           lints via eslint
   lint_eslint_fix       lints and auto-fixes via eslint --fix
   lint_tsc              lints via tsc
  -------------------
   test                  runs bun test(s)
   test_watch            runs bun test(s) in watch mode
   test_update           runs bun test --update-snapshots
  -------------------
   help                  displays (this) help screen
```
