/**                                                                       @about
@file: README.test.ts
@desc: tests form the README to make sure the examples are correct
***                                                                           */
import {
  expect,
  test,
  describe,
} from 'bun:test';
import {
  commentDirective,
} from './index.ts';


describe('QuickStart Examples', () => {

  const BASIC_IF_V2_INPUT = `
// ###[IF]env=1;rm=comment;un=comment;
// console.log('if env=1, remove me; else, un-comment me');

// ###[IF]env=1;rm=line;sed=/surgical blade/chainsaw/;
const aWellOiled = "surgical blade";`;

  const BASIC_IF_V2_ENV_0_EXPECTED = `
console.log('if env=1, remove me; else, un-comment me');

const aWellOiled = "chainsaw";`;

  test('basic if directive v2', () => {
    expect(commentDirective(BASIC_IF_V2_INPUT, { env: 1 }).trim()).toEqual('');
    expect(commentDirective(BASIC_IF_V2_INPUT, { env: 0 }))
      .toEqual(BASIC_IF_V2_ENV_0_EXPECTED);
  });

  const BASIC_IF_V1_INPUT = `
// ###[IF]env=1;rm=comment;un=comment;
// console.log('rm if env=1; otherwise un-comment');`.trim();

  test('basic if directive', () => {
    expect(commentDirective(BASIC_IF_V1_INPUT, { env: 1 })).toEqual('');
    expect(commentDirective(BASIC_IF_V1_INPUT, { env: 0 }))
      .toEqual('console.log(\'rm if env=1; otherwise un-comment\');');
  });


  const AN_EXAMPLE_INPUT = `
// ###[IF]prod=1;un=comment;rm=comment;
const anExample = (arg = [1,/* {aFn: () => ['dev']},*/ 2, 3]) => {
  // ###[IF]prod=0;sed=/80/3000/;
  // ###[IF]prod=1;sed=/dev.api.com/api.fun/;
  const str = 'https://dev.api.com:80'
  return {str, arg};
};`.trim();

  const AN_EXAMPLE_PROD_1_EXPECTED = `
const anExample = (arg = [1, {aFn: () => ['dev']}, 2, 3]) => {
  const str = 'https://api.fun:80'
  return {str, arg};
};`.trim();

  const AN_EXAMPLE_PROD_0_EXPECTED = `
const anExample = (arg = [1, 2, 3]) => {
  const str = 'https://dev.api.com:3000'
  return {str, arg};
};`.trim();

  test('contrived example prod=1', () => {
    expect(commentDirective(AN_EXAMPLE_INPUT, { prod: 1 }))
      .toEqual(AN_EXAMPLE_PROD_1_EXPECTED);
  });

  test('contrived example prod=0', () => {
    expect(commentDirective(AN_EXAMPLE_INPUT, { prod: 0 }))
      .toEqual(AN_EXAMPLE_PROD_0_EXPECTED);
  });


  const CONTRIVED_EXAMPLE_INPUT = `
// ###[IF]prod=1;un=comment;rm=comment;
const aContrivedExample = (arg = [1,/* {aFn: () => ['dev']},*/ 2, 3]) => {
  // ###[IF]prod=1;sed=/my.api.com/localhost/;
  const str = 'https://my.api.com:3000'
  return {str, arg};
};`.trim();

  const CONTRIVED_EXAMPLE_PROD_1_EXPECTED = `
const aContrivedExample = (arg = [1, {aFn: () => ['dev']}, 2, 3]) => {
  const str = 'https://localhost:3000'
  return {str, arg};
};`.trim();

  const CONTRIVED_EXAMPLE_PROD_0_EXPECTED = `
const aContrivedExample = (arg = [1, 2, 3]) => {
  const str = 'https://my.api.com:3000'
  return {str, arg};
};`.trim();

  test('contrived example prod=1', () => {
    expect(commentDirective(CONTRIVED_EXAMPLE_INPUT, { prod: 1 }))
      .toEqual(CONTRIVED_EXAMPLE_PROD_1_EXPECTED);
  });

  test('contrived example prod=0', () => {
    expect(commentDirective(CONTRIVED_EXAMPLE_INPUT, { prod: 0 }))
      .toEqual(CONTRIVED_EXAMPLE_PROD_0_EXPECTED);
  });

});

describe('Directive Actions', () => {
  describe('rm=<N>L', () => {
    const RM_2L_INPUT = `
// ###[IF]env=prod;rm=2L;
console.debug('removes the');
console.debug('de-bug(s)');
console.warn('but not this warn');`.trim();

    const RM_2L_EXPECTED = `
console.warn('but not this warn');`.trim();

    test('removes next N lines', () => {
      expect(commentDirective(RM_2L_INPUT, { env: 'prod' }))
        .toEqual(RM_2L_EXPECTED);
    });
  });

  describe('(rm|un)=comment', () => {
    const RM_UN_COMMENT_INPUT = `
// ###[IF]prod=1;rm=comment;un=comment;
/*
console.debug('debug all');
console.debug('the bugs');
*/
// another comment`.trim();

    const RM_UN_COMMENT_PROD_0_EXPECTED = `
console.debug('debug all');
console.debug('the bugs');

// another comment`;

    const RM_UN_COMMENT_PROD_1_EXPECTED = `
// another comment`.trim();

    test('removes and uncomments comment blocks', () => {
      expect(commentDirective(RM_UN_COMMENT_INPUT, { prod: 0 }))
        .toEqual(RM_UN_COMMENT_PROD_0_EXPECTED);

      expect(commentDirective(RM_UN_COMMENT_INPUT, { prod: 1 }))
        .toEqual(RM_UN_COMMENT_PROD_1_EXPECTED);
    });
  });

  describe('sed', () => {
    const SED_BASIC_INPUT = `
// ###[IF]env=prod;sed=/3000/80/;
const port = 3000;`.trim();
    const SED_BASIC_EXPECTED = `
const port = 80;`.trim();

    test('basic sed replacement', () => {
      expect(commentDirective(SED_BASIC_INPUT, { env: 'prod' }))
        .toEqual(SED_BASIC_EXPECTED);
    });

    const SED_N_LINES_INPUT = `
// ###[IF]boat=1;sed=/log/debug/2L;
console.log('test');
console.log('the');
console.log('best');`.trim();
    const SED_N_LINES_EXPECTED = `
console.debug('test');
console.debug('the');
console.log('best');`.trim();

    test('sed with N lines limit', () => {
      expect(commentDirective(SED_N_LINES_INPUT, { boat: 1 }))
        .toEqual(SED_N_LINES_EXPECTED);
    });

    const SED_STOP_MARKER_INPUT = `
// ###[IF]goat=1;sed=/log/debug/@//#STOP;
console.log('test');
console.log('the');
//#STOP
console.log('best');`.trim();
    const SED_STOP_MARKER_EXPECTED = `
console.debug('test');
console.debug('the');
//#STOP
console.log('best');`.trim();

    test('sed with stop marker', () => {
      expect(commentDirective(SED_STOP_MARKER_INPUT, { goat: 1 }))
        .toEqual(SED_STOP_MARKER_EXPECTED);
    });


    const SED_REGEX_NO_ESCAPE_INPUT = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123`.trim();

    test('regex with escape disabled', () => {
      expect(commentDirective(SED_REGEX_NO_ESCAPE_INPUT, { reg: 1 }, { escape: false }))
        .toEqual('\n456'.trim());
    });


    test('regex with escape disabled', () => {
      const ESCAPE_DISABLED = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123`.trim();

      expect(commentDirective(ESCAPE_DISABLED, {reg: 1}, {escape: false})).toEqual(`
456`.trim());

      test('escape false with custom delimiter', () => {
        const ESCAPE_FALSE_DELIM = `
  // ###[IF]regex=1;sed=%\\w+%REPLACED%;
  someWord123`.trim();

        expect(commentDirective(ESCAPE_FALSE_DELIM, {regex: 1}, {
          delimiter: '%',
          escape: false,
        })).toEqual('REPLACED');
      });

    });


    const SED_GLOBAL_FLAG_INPUT = `
console.LOG('test');
// ###[IF]jolt=1;sed=/log/debug/gi;
console.LOG('the');
console.LOG('best');
console.LOG('log');`.trim();
    const SED_GLOBAL_FLAG_EXPECTED = `
console.LOG('test');
console.debug('the');
console.debug('best');
console.debug('debug');`.trim();

    test('global flag example', () => {
      expect(commentDirective(SED_GLOBAL_FLAG_INPUT, { jolt: 1 }))
        .toEqual(SED_GLOBAL_FLAG_EXPECTED);
    });
  });

  describe('sequence actions', () => {
    const SEQ_PREPEND_APPEND_INPUT = `
// ###[IF]prod=1;prepend=// /4L;
// ###[IF]prod=1;append= /* app-ended *///@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP`;
    const SEQ_PREPEND_APPEND_EXPECTED = `
// ###[IF]prod=1;prepend=// /4L;
// ###[IF]prod=1;append= /* app-ended *///@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */
//   return 2 ** fac; /* app-ended */
// }; /* app-ended */
// //#STOP /* app-ended */`;

    test('prepend and append', () => {
      expect(commentDirective(SEQ_PREPEND_APPEND_INPUT, { prod: 1 }, { keepDirective: true }))
        .toEqual(SEQ_PREPEND_APPEND_EXPECTED);
    });

    const SEQ_SHIFT_POP_INPUT = `
// ###[IF]prod=1;shift=// /4L;
// ###[IF]prod=1;pop= /* app-ended *///@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */
//   return 2 ** fac; /* app-ended */
// }; /* app-ended */
// //#STOP /* app-ended */ `.trim();
    const SEQ_SHIFT_POP_EXPECTED = `
// ###[IF]prod=1;shift=// /4L;
// ###[IF]prod=1;pop= /* app-ended *///@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP`.trim();

    test('shift and pop', () => {
      expect(commentDirective(SEQ_SHIFT_POP_INPUT, { prod: 1 }, { keepDirective: true }))
        .toEqual(SEQ_SHIFT_POP_EXPECTED);
    });

    const SEQ_REVERSIBLE_INPUT = `
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
console.log('nondestructive');
console.log('reversible');`.trim();
    const SEQ_REVERSIBLE_ONCE_EXPECTED = `
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
// console.log('nondestructive');
// console.log('reversible');`.trim();

    test('reversible/nondestructive', () => {
      const once = commentDirective(SEQ_REVERSIBLE_INPUT, { prod: 1 }, { keepDirective: true });
      const twice = commentDirective(once, { prod: 1 }, { keepDirective: true });
      const thrice = commentDirective(twice, { prod: 0 }, { keepDirective: true });

      expect(SEQ_REVERSIBLE_INPUT).toEqual(thrice);
      expect(once).toEqual(twice);
      expect(twice).toEqual(SEQ_REVERSIBLE_ONCE_EXPECTED);
      expect(twice).not.toEqual(SEQ_REVERSIBLE_INPUT);
    });
  });
});

describe('Stacked Directives', () => {
  const STACKED_BASIC_INPUT = `
// ###[IF]opt=1;un=comment;
// ###[IF]alt=2;sed=/vegetable/protein/;
// ###[IF]cat=0;sed=/stack/hack/;
// let vegetable = 'stack';`.trim();

  test('basic stacked example', () => {
    expect(commentDirective(STACKED_BASIC_INPUT, { opt: 0 }))
      .toEqual('// let vegetable = \'stack\';');
    expect(commentDirective(STACKED_BASIC_INPUT, { opt: 1 }))
      .toEqual('let vegetable = \'stack\';');
    expect(commentDirective(STACKED_BASIC_INPUT, { opt: 1, alt: 2 }))
      .toEqual('let protein = \'stack\';');
    expect(commentDirective(STACKED_BASIC_INPUT, { cat: 0, alt: 2 }))
      .toEqual('// let protein = \'hack\';');
  });

  const STACKED_CHAINED_SED_INPUT = `
// ###[IF]stacked=1;sed=/aaa/bbb/;
// ###[IF]stacked=1;sed=/bbb/ccc/;
aaa`.trim();

  test('chained sed replacements', () => {
    expect(commentDirective(STACKED_CHAINED_SED_INPUT, { stacked: 1 }))
      .toEqual('ccc');
  });

  const STACKED_COMPLEX_NESTED_INPUT = `
// ###[IF]stacked=1;un=comment;
/*
// ###[IF]stacked=1;un=comment;
// ###[IF]stacked=1;sed=/foolery/foolery works!/;
// let like = 'even this kind of tomfoolery';
*/`.trim();

  test('complex nested stacking', () => {
    expect(commentDirective(STACKED_COMPLEX_NESTED_INPUT, { stacked: 1 }).trim())
      .toEqual(`let like = 'even this kind of tomfoolery works!';`);
  });

  const STACKED_MULTIPLE_SED_INPUT = `
// ###[IF]srsly=1;sed=/the quick/brown fox/;
// ###[IF]srsly=1;sed=/brown fox/jumps over/;
// ###[IF]srsly=1;sed=/jumps over/the lazy dog/;
brown fox jumps over the the quick`.trim();

  test('multiple sed replacements', () => {
    expect(commentDirective(STACKED_MULTIPLE_SED_INPUT, { srsly: 1 }))
      .toEqual('the lazy dog jumps over the brown fox');
  });
});

describe('Language Support', () => {
  const LANG_PYTHON_INPUT = `
# ###[IF]python=1;un=comment;
# print('python may be for thee, but not for me')
# ###[IF]python=1;un=comment;
'''
print('python may be for thee, but not for me')
'''
# ###[IF]python=1;un=comment;
"""
print('python may be for thee, but not for me')
"""`.trim();

  const LANG_PYTHON_EXPECTED = `
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')`.trim();

  test('python example', () => {
    const result = commentDirective(LANG_PYTHON_INPUT, { python: 1 }, {
      single: [/#\s*/, null],
      multi: [/^\s*('''|""")/, /('''|""")/],
    });

    const filtered = result.split('\n').filter(Boolean).join('\n');

    expect(filtered).toEqual(LANG_PYTHON_EXPECTED);
  });

  const LANG_HTML_INPUT = `
<!-- ###[IF]doyou=html;un=comment; -->
<!-- ###[IF]doyou=html;sed=/yes.js/ido.js/; -->
<!-- <script src="yes.js"></script> -->`.trim();

  test('html example', () => {
    expect(commentDirective(LANG_HTML_INPUT, { doyou: 'html' }, {
      single: [/<!--\s*/, /\s*-->/],
      multi: [/<!--/, /-->/],
    }).trim()).toEqual('<script src="ido.js"></script>');
  });
});

describe('Raw Regex Examples', () => {
  const RAW_REGEX_COMPLEX_INPUT = `
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};`.trim();

  test('complex regex commenting', () => {
    const options = {
      keepDirective: true,
      delimiter: '##',
      escape: false,
    };

    // Test rexy=1 (comments out)
    const result1 = commentDirective(RAW_REGEX_COMPLEX_INPUT, { rexy: 1 }, options);
    expect(result1).toContain('// const myKoolFunction');
    expect(result1).toContain('//   const res');
    expect(result1).toContain('//   return res.length;');
    expect(result1).toContain('// };');

    // Test rexy=0 (uncomments)
    const result0 = commentDirective(result1, { rexy: 0 }, options);
    expect(result0).toContain('const myKoolFunction');
    expect(result0).toContain('  const res');
    expect(result0).toContain('  return res.length;');
    expect(result0).toContain('};');
    expect(result0).toContain('const lesserFunction');
  });

  const RAW_REGEX_TWOWAY_INPUT = `
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};`;
  const RAW_REGEX_TWOWAY_EXPECTED = `
// ###[IF]rexy=1;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]rexy=0;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
// const myKoolFunction = (arg = 'logic'): number => {
//   const res = 'big ' + arg;
//${' '}
//   return res.length;
// };
// //#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};`;

  test('two-way raw regex from README note', () => {
    const options = {
      keepDirective: true, // prevents comment directive from being removed
      delimiter: '##',     // changes sed delimiter from '/' to '##'
      escape: false,       // disables string escape (needed to use regex)
    };

    const result1 = commentDirective(RAW_REGEX_TWOWAY_INPUT, { rexy: 1 }, options);
    expect(result1).toBe(RAW_REGEX_TWOWAY_EXPECTED);

    const result2 = commentDirective(result1, { rexy: 0 }, options);
    expect(result2).toBe(RAW_REGEX_TWOWAY_INPUT);
  });
});


describe('Options', () => {
  describe('delimiter', () => {
    const OPTIONS_DELIMITER_URL_INPUT = `
// ###[IF]reg=1;sed=%s://a.super/long/path%://z.super/dup/er/long/path%;
'https://a.super/long/path';`.trim();

    test('custom delimiter with URL paths', () => {
      expect(commentDirective(OPTIONS_DELIMITER_URL_INPUT, { reg: 1 }, { delimiter: '%' }))
        .toEqual('\'http://z.super/dup/er/long/path\';');
    });

    const OPTIONS_DELIMITER_MATH_INPUT = `
// ###[IF]reg=1;sed=###/###+###;
let maths = 1 / 2 / 3;
`.trim();

    test('custom delimiter', () => {
      expect(commentDirective(OPTIONS_DELIMITER_MATH_INPUT, { reg: 1 }, { delimiter: '###' }))
        .toBe('let maths = 1 + 2 / 3;');
    });

    test('delimiter with math example', () => {
      expect(commentDirective(OPTIONS_DELIMITER_MATH_INPUT, { reg: 1 }, { delimiter: '###' }))
        .toBe('let maths = 1 + 2 / 3;');
    });

    test('global replacement with limit', () => {
      const input = `
// ###[IF]reg=1;sed=###/###+###g1L;
let maths  = 1 / 2 / 3;
let mathss = 1 / 2 / 3;`;
      const expected = `
let maths  = 1 + 2 + 3;
let mathss = 1 / 2 / 3;`;
      expect(commentDirective(input, { reg: 1 }, { delimiter: '###' }))
        .toEqual(expected);
    });
  });

  describe('nestedComments', () => {
    test('this unholy desecration should work', () => {
      expect(commentDirective(`
// ###[IF]nested=1;un=comment;
/* /* devil worship */  */`, {
        nested: 1,
      }, { nested: true }).trim()).toBe('/* devil worship */');
    });

    const COMPLEX_NESTED_INPUT = `
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;sed=/details/Nested Comments/i;
/* /* /* /* /* The Devil's in the Details */ */ */ */ */`;
    const COMPLEX_NESTED_EXPECTED = '/* /* The Devil\'s in the Nested Comments */ */';

    test('complex nested un-commenting from README', () => {
      expect(commentDirective(COMPLEX_NESTED_INPUT, {
        nested: 1,
      }, { nested: true }).trim()).toEqual(COMPLEX_NESTED_EXPECTED);
    });
  });

  describe('escape', () => {
    const ESCAPE_DISABLED_INPUT = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123`.trim();

    test('regex pattern with escape disabled', () => {
      expect(commentDirective(ESCAPE_DISABLED_INPUT, { reg: 1 }, { escape: false }))
        .toEqual('456');
    });

    const ESCAPE_ENABLED_INPUT = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
\\d{3,}`.trim();

    test('literal pattern with escape enabled (default)', () => {
      expect(commentDirective(ESCAPE_ENABLED_INPUT, { reg: 1 }, { escape: true }))
        .toEqual('456');
    });
  });

  describe('identifier', () => {
    const IDENTIFIER_CUSTOM1_INPUT = `
// @@@[VROOOOOOOOOM]too=fast;rm=1L;
console.log('speed racer');`.trim();

    test('custom identifier', () => {
      expect(commentDirective(
        IDENTIFIER_CUSTOM1_INPUT,
        { too: 'fast' },
        { identifier: '@@@[VROOOOOOOOOM]' },
      )).toEqual('');
    });

    const IDENTIFIER_CUSTOM2_INPUT = `
// [CUSTOM]test=1;sed=/foo/bar/;
foo`.trim();

    test('different custom identifier', () => {
      expect(commentDirective(IDENTIFIER_CUSTOM2_INPUT, { test: 1 }, { identifier: '[CUSTOM]' }))
        .toEqual('bar');
    });
  });

  describe('loose', () => {
    const LOOSE_INPUT = `
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');`;

    const LOOSE_FALSE_EXPECTED = `
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');`;

    const LOOSE_TRUE_EXPECTED = `
console.log('willy');
console.log('nilly');
// a directive always targets the line below
console.log('i stay');
//`;

    test('example from README', () => {
      const RESULT_LOOSE_FALSE = commentDirective(
        LOOSE_INPUT, { loosey: 'goosey' }, { loose: false },
      );
      const RESULT_LOOSE_TRUE = commentDirective(
        LOOSE_INPUT, { loosey: 'goosey' }, { loose: true },
      );

      expect(RESULT_LOOSE_FALSE).toBe(LOOSE_FALSE_EXPECTED);
      expect(RESULT_LOOSE_TRUE).toBe(LOOSE_TRUE_EXPECTED);
    });


    test('example 2 from README', () => {
      const RESULT_LOOSE = commentDirective(`
      // ###[IF]loose=1;sed=/log/play/;
      // ###[IF]loose=1;sed=/super/fast/;
      loging('super'); // ###[IF]loose=1;sed=/loging/and/;
      loging('loose');`, { loose: 1 }, { loose: true });
      expect(RESULT_LOOSE).toBe(`
      playing('fast');
      and('loose');`);
    });


  });

  describe('keepEmptyLines', () => {
    const KEEP_EMPTY_LINES_INPUT = `
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ###[IF]prod=1;rm=comment;
/*
console.debug('take anything but');
console.debug('my whitespace');
*/
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;
    const KEEP_EMPTY_LINES_FALSE_EXPECTED = `
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;
    const KEEP_EMPTY_LINES_TRUE_EXPECTED = `
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~





// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;

    test('keepEmptyLines false (default)', () => {
      expect(commentDirective(KEEP_EMPTY_LINES_INPUT, { prod: 1 }, { keepEmpty: false }))
        .toEqual(KEEP_EMPTY_LINES_FALSE_EXPECTED);
    });

    test('keepEmptyLines true', () => {
      expect(commentDirective(KEEP_EMPTY_LINES_INPUT, { prod: 1 }, { keepEmpty: true }))
        .toEqual(KEEP_EMPTY_LINES_TRUE_EXPECTED);
    });

    const KEEP_EMPTY_LINES_MULTI_SECTION_INPUT = `
line1
// ###[IF]test=1;rm=2L;
remove1
remove2

line2`;
    const KEEP_EMPTY_LINES_MULTI_SECTION_TRUE_EXPECTED = `
line1




line2`;
    const KEEP_EMPTY_LINES_MULTI_SECTION_FALSE_EXPECTED = `
line1

line2`;

    test('keepEmptyLines with multiple empty sections', () => {
      const RESULT_KEEP_EMPTY = commentDirective(
        KEEP_EMPTY_LINES_MULTI_SECTION_INPUT,
        { test: 1 },
        { keepEmpty: true },
      );
      const RESULT_NO_KEEP_EMPTY = commentDirective(
        KEEP_EMPTY_LINES_MULTI_SECTION_INPUT,
        { test: 1 },
        { keepEmpty: false },
      );

      expect(RESULT_KEEP_EMPTY).toEqual(KEEP_EMPTY_LINES_MULTI_SECTION_TRUE_EXPECTED);
      expect(RESULT_NO_KEEP_EMPTY).toEqual(KEEP_EMPTY_LINES_MULTI_SECTION_FALSE_EXPECTED);
    });
  });

  describe('keepSpace', () => {
    const KEEP_SPACE_INPUT = `
<div>
  {/* ###[IF]ui=1;un=comment; */}
  {/* <UI /> */}
  <OtherJunk />
</div>`;
    const KEEP_SPACE_FALSE_EXPECTED = `
<div>
  <UI />
  <OtherJunk />
</div>`;
    const KEEP_SPACE_TRUE_EXPECTED = `
<div>
<UI />${' '}
  <OtherJunk />
</div>`;


    test('keepSpace variations', () => {
      expect(commentDirective(KEEP_SPACE_INPUT, { ui: 1 }, {
        single: [/^\s*\{\/\*\s*/, /\*\/\}/],
        multi: [/^\s*\{\/\*\s*/, /\*\/\}/],
        keepSpace: false,
      })).toEqual(KEEP_SPACE_FALSE_EXPECTED);

      expect(commentDirective(KEEP_SPACE_INPUT, { ui: 1 }, {
        single: [/^\s*\{\/\*\s*/, /\*\/\}/],
        multi: [/^\s*\{\/\*\s*/, /\*\/\}/],
        keepSpace: true,
      })).toEqual(KEEP_SPACE_TRUE_EXPECTED);
    });


    const KEEP_SPACE_INDENT_INPUT = `
    // ###[IF]test=1;un=comment;
    // const indented = true;
  const lessIndented = true;`;
    const KEEP_SPACE_INDENT_FALSE_EXPECTED = `
    const indented = true;
  const lessIndented = true;`;
    const KEEP_SPACE_INDENT_TRUE_EXPECTED = `
const indented = true;
  const lessIndented = true;`;

    test('keepSpace with different indentation levels', () => {
      expect(commentDirective(KEEP_SPACE_INDENT_INPUT, { test: 1 }, { keepSpace: false }))
        .toEqual(KEEP_SPACE_INDENT_FALSE_EXPECTED);

      expect(commentDirective(KEEP_SPACE_INDENT_INPUT, { test: 1 }, { keepSpace: true }))
        .toEqual(KEEP_SPACE_INDENT_TRUE_EXPECTED);
    });
  });

  describe('keepDirective', () => {
    const KEEP_DIRECTIVE_INPUT = `
// ###[IF]test=1;sed=/foo/bar/;
foo`.trim();
    const KEEP_DIRECTIVE_TRUE_EXPECTED = `
// ###[IF]test=1;sed=/foo/bar/;
bar`.trim();

    test('keepDirective true', () => {
      expect(commentDirective(KEEP_DIRECTIVE_INPUT, { test: 1 }, { keepDirective: true }))
        .toEqual(KEEP_DIRECTIVE_TRUE_EXPECTED);
    });

    test('keepDirective false (default)', () => {
      expect(commentDirective(KEEP_DIRECTIVE_INPUT, { test: 1 }, { keepDirective: false }))
        .toEqual('bar');
    });
  });
});

describe('Edge Cases / Other', () => {
  const EDGE_KEEP_DIRECTIVE_INPUT = `
// ###[IF]test=1;sed=/foo/bar/;
foo`.trim();

  test('keepDirective option', () => {
    const WITH_KEEP_RES = commentDirective(
      EDGE_KEEP_DIRECTIVE_INPUT, { test: 1 }, { keepDirective: true },
    );
    const WITHOUT_KEEP_RES = commentDirective(
      EDGE_KEEP_DIRECTIVE_INPUT, { test: 1 }, { keepDirective: false },
    );

    expect(WITH_KEEP_RES).toContain('###[IF]');
    expect(WITHOUT_KEEP_RES).not.toContain('###[IF]');
    expect(WITH_KEEP_RES).toContain('bar');
    expect(WITHOUT_KEEP_RES).toContain('bar');
  });

  const EDGE_TWOWAY_DIRECTIVE_INPUT = `
// ###[IF]env=prod;un=comment;rm=comment;
// console.log('ENV: production');`.trim();

  test('two-way directive syntax', () => {
    expect(commentDirective(EDGE_TWOWAY_DIRECTIVE_INPUT, { env: 'prod' }))
      .toEqual('console.log(\'ENV: production\');');
    expect(commentDirective(EDGE_TWOWAY_DIRECTIVE_INPUT, { env: 'dev' }))
      .toEqual('');
  });
});
