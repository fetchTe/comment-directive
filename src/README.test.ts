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

  test('basic if directive v2', () => {
    const input = `
// ###[IF]env=1;rm=comment;un=comment;
// console.log('if env=1, remove me; else, un-comment me');

// ###[IF]env=1;rm=line;sed=/surgical blade/chainsaw/;
const aWellOiled = "surgical blade";`;


    expect(commentDirective(input, {env: 1}).trim()).toEqual('');
    expect(commentDirective(input, {env: 0}))
      .toEqual(`
console.log('if env=1, remove me; else, un-comment me');

const aWellOiled = "chainsaw";`);
  });

  test('basic if directive', () => {
    const input = `
// ###[IF]env=1;rm=comment;un=comment;
// console.log('rm if env=1; otherwise un-comment');`.trim();

    expect(commentDirective(input, {env: 1})).toEqual('');
    expect(commentDirective(input, {env: 0}))
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
// ###[IF]prod=1;un=comment;rm=comment;
const aContrivedExample = (arg = [1,/* {aFn: () => ['dev']},*/ 2, 3]) => {
  // ###[IF]prod=1;sed=/my.api.com/localhost/;
  const str = 'https://my.api.com:3000'
  return {str, arg};
};`.trim();

    expect(commentDirective(input, {prod: 0})).toEqual(`
const aContrivedExample = (arg = [1, 2, 3]) => {
  const str = 'https://my.api.com:3000'
  return {str, arg};
};`.trim());
  });
});

describe('Directive Actions', () => {
  describe('rm=<N>L', () => {
    test('removes next N lines', () => {
      const input = `
// ###[IF]env=prod;rm=2L;
console.debug('removes the');
console.debug('de-bug(s)');
console.warn('but not this warn');`.trim();

      expect(commentDirective(input, {env: 'prod'})).toEqual(`
console.warn('but not this warn');`.trim());
    });
  });

  describe('(rm|un)=comment', () => {
    test('removes and uncomments comment blocks', () => {
      const input = `
// ###[IF]prod=1;rm=comment;un=comment;
/*
console.debug('debug all');
console.debug('the bugs');
*/
// another comment`.trim();

      expect(commentDirective(input, {prod: 0})).toEqual(`
console.debug('debug all');
console.debug('the bugs');

// another comment`);

      expect(commentDirective(input, {prod: 1})).toEqual(`
// another comment`.trim());


    });

  });

  describe('sed', () => {
    test('basic sed replacement', () => {
      const input = `
// ###[IF]env=prod;sed=/3000/80/;
const port = 3000;`.trim();

      expect(commentDirective(input, {env: 'prod'})).toEqual(`
const port = 80;`.trim());
    });

    test('sed with N lines limit', () => {
      const input = `
// ###[IF]boat=1;sed=/log/debug/2L;
console.log('test');
console.log('the');
console.log('best');`.trim();

      expect(commentDirective(input, {boat: 1})).toEqual(`
console.debug('test');
console.debug('the');
console.log('best');`.trim());
    });

    test('sed with stop marker', () => {
      const input = `
// ###[IF]goat=1;sed=/log/debug/@//#STOP;
console.log('test');
console.log('the');
//#STOP
console.log('best');`.trim();

      expect(commentDirective(input, {goat: 1})).toEqual(`
console.debug('test');
console.debug('the');
//#STOP
console.log('best');`.trim());
    });


    test('regex with escape disabled', () => {
      const input = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123`.trim();

      expect(commentDirective(input, {reg: 1}, {escape: false})).toEqual(`
456`.trim());

      test('escape false with custom delimiter', () => {
        const input = `
  // ###[IF]regex=1;sed=%\\w+%REPLACED%;
  someWord123`.trim();

        expect(commentDirective(input, {regex: 1}, {
          delimiter: '%',
          escape: false,
        })).toEqual('REPLACED');
      });

    });

    test('global flag example', () => {
      const input = `
console.LOG('test');
// ###[IF]jolt=1;sed=/log/debug/gi;
console.LOG('the');
console.LOG('best');
console.LOG('log');`.trim();

      expect(commentDirective(input, {jolt: 1})).toEqual(`
console.LOG('test');
console.debug('the');
console.debug('best');
console.debug('debug');`.trim());
    });
  });

  describe('sequence actions', () => {
    test('prepend and append', () => {
      const input = `
// ###[IF]prod=1;prepend=// /4L;
// ###[IF]prod=1;append= /* app-ended *///@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP`;

      expect(commentDirective(input, {prod: 1}, {keepDirective: true})).toEqual(`
// ###[IF]prod=1;prepend=// /4L;
// ###[IF]prod=1;append= /* app-ended *///@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */
//   return 2 ** fac; /* app-ended */
// }; /* app-ended */
// //#STOP /* app-ended */`);


    });

    test('shift and pop', () => {
      const input = `
// ###[IF]prod=1;shift=// /4L;
// ###[IF]prod=1;pop= /* app-ended *///@//#STOP;
// const itsExponential = (fac = 2) => { /* app-ended */
//   return 2 ** fac; /* app-ended */
// }; /* app-ended */
// //#STOP /* app-ended */ `.trim();

      expect(commentDirective(input, {prod: 1}, {keepDirective: true})).toEqual(`
// ###[IF]prod=1;shift=// /4L;
// ###[IF]prod=1;pop= /* app-ended *///@//#STOP;
const itsExponential = (fac = 2) => {
  return 2 ** fac;
};
//#STOP`.trim());
    });

    test('reversible/nondestructive', () => {
      const input = `
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
console.log('nondestructive');
console.log('reversible');`.trim();

      const once = commentDirective(input, {prod: 1}, {keepDirective: true});
      const twice = commentDirective(once, {prod: 1}, {keepDirective: true});
      const thrice = commentDirective(twice, {prod: 0}, {keepDirective: true});

      expect(input).toEqual(thrice);
      expect(once).toEqual(twice);
      expect(twice).toEqual(`
// ###[IF]prod=1;prepend=// /2L;shift=// /2L;
// console.log('nondestructive');
// console.log('reversible');`.trim());
      expect(twice).not.toEqual(input);
    });
  });
});

describe('Stacked Directives', () => {
  test('basic stacked example', () => {
    const input = `
// ###[IF]opt=1;un=comment;
// ###[IF]alt=2;sed=/vegetable/protein/;
// ###[IF]cat=0;sed=/stack/hack/;
// let vegetable = 'stack';`.trim();

    expect(commentDirective(input, {opt: 0})).toEqual('// let vegetable = \'stack\';');
    expect(commentDirective(input, {opt: 1})).toEqual('let vegetable = \'stack\';');
    expect(commentDirective(input, {opt: 1, alt: 2})).toEqual('let protein = \'stack\';');
    expect(commentDirective(input, {cat: 0, alt: 2})).toEqual('// let protein = \'hack\';');
  });

  test('chained sed replacements', () => {
    const input = `
// ###[IF]stacked=1;sed=/aaa/bbb/;
// ###[IF]stacked=1;sed=/bbb/ccc/;
aaa`.trim();

    expect(commentDirective(input, {stacked: 1})).toEqual('ccc');
  });

  test('complex nested stacking', () => {
    const input = `
// ###[IF]stacked=1;un=comment;
/*
// ###[IF]stacked=1;un=comment;
// ###[IF]stacked=1;sed=/foolery/foolery works!/;
// let like = 'even this kind of tomfoolery';
*/`.trim();

    expect(commentDirective(input, {stacked: 1}).trim())
      .toEqual(`let like = 'even this kind of tomfoolery works!';`);
  });

  test('multiple sed replacements', () => {
    const input = `
// ###[IF]srsly=1;sed=/the quick/brown fox/;
// ###[IF]srsly=1;sed=/brown fox/jumps over/;
// ###[IF]srsly=1;sed=/jumps over/the lazy dog/;
brown fox jumps over the the quick`.trim();

    expect(commentDirective(input, {srsly: 1})).toEqual('the lazy dog jumps over the brown fox');
  });
});

describe('Language Support', () => {
  test('python example', () => {
    const input = `
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

    const result = commentDirective(input, { python: 1 }, {
      single: [/#\s*/, null],
      multi: [/^\s*('''|""")/, /('''|""")/],
    });

    const filtered = result.split('\n').filter(Boolean).join('\n');

    expect(filtered).toEqual(`
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')
print('python may be for thee, but not for me')`.trim());
  });

  test('html example', () => {
    const input = `
<!-- ###[IF]doyou=html;un=comment; -->
<!-- ###[IF]doyou=html;sed=/yes.js/ido.js/; -->
<!-- <script src="yes.js"></script> -->`.trim();

    expect(commentDirective(input, { doyou: 'html' }, {
      single: [/<!--\s*/, /\s*-->/],
      multi: [/<!--/, /-->/],
    }).trim()).toEqual('<script src="ido.js"></script>');
  });
});

describe('Raw Regex Examples', () => {
  test('complex regex commenting', () => {
    const input = `
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

    const options = {
      keepDirective: true,
      delimiter: '##',
      escape: false,
    };

    // Test rexy=1 (uncomments)
    const result1 = commentDirective(input, {rexy: 1}, options);
    expect(result1).toContain('// const myKoolFunction');
    expect(result1).toContain('//   const res');
    expect(result1).toContain('//   return res.length;');
    expect(result1).toContain('// };');

    // Test rexy=0 (comments out)
    const result0 = commentDirective(result1, {rexy: 0}, options);
    expect(result0).toContain('const myKoolFunction');
    expect(result0).toContain('  const res');
    expect(result0).toContain('  return res.length;');
    expect(result0).toContain('};');
    expect(result0).toContain('const lesserFunction');
  });

  test('two-way raw regex from README note', () => {
    // From the README Note on combining directives:
    // ###[IF]rexy=0;sed=...;sed=...
    const codeBlock_in = `
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
    const codeBlock_out = `
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
    const options = {
      keepDirective: true, // prevents comment directive from being removed
      delimiter: '##',     // changes sed delimiter from '/' to '##'
      escape: false,       // disables string escape (needed to use regex)
    };

    const result1 = commentDirective(codeBlock_in, { rexy: 1 }, options);
    expect(result1).toBe(codeBlock_out);
    const result2 = commentDirective(result1, { rexy: 0 }, options);
    expect(result2).toBe(codeBlock_in);

  });
});


describe('Options', () => {
  describe('delimiter', () => {
    test('custom delimiter with URL paths', () => {
      const input = `
// ###[IF]reg=1;sed=%s://a.super/long/path%://z.super/dup/er/long/path%;
'https://a.super/long/path';`.trim();

      expect(commentDirective(input, {reg: 1}, {delimiter: '%'}))
        .toEqual('\'http://z.super/dup/er/long/path\';');
    });


    test('custom delimiter', () => {
      expect(commentDirective(`
// ###[IF]reg=1;sed=###/###+###;
let maths = 1 / 2 / 3;
`.trim(), {reg: 1}, {delimiter: '###'}) === 'let maths = 1 + 2 / 3;').toBe(true);
    });

    test('delimiter with math example', () => {
      expect(commentDirective(`
// ###[IF]reg=1;sed=###/###+###;
let maths = 1 / 2 / 3;
`.trim(), {reg: 1}, {delimiter: '###'}) === 'let maths = 1 + 2 / 3;').toBe(true);
    });

    test('global replacement with limit', () => {
      expect(commentDirective(`
// ###[IF]reg=1;sed=###/###+###g1L;
let maths  = 1 / 2 / 3;
let mathss = 1 / 2 / 3;`, {reg: 1}, {delimiter: '###'})
// done
=== `
let maths  = 1 + 2 + 3;
let mathss = 1 / 2 / 3;`).toBe(true);

    });


  });

  describe('nestedComments', () => {
    test('this unholy desecration should work', () => {
      expect(commentDirective(`
// ###[IF]nested=1;un=comment;
/* /* devil worship */  */`, {
        nested: 1,
      }, {nested: true}).trim() === '/* devil worship */').toBe(true);
    });

    test('complex nested un-commenting from README', () => {
      const input = `
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;un=comment;
// ###[IF]nested=1;sed=/details/Nested Comments/i;
/* /* /* /* /* The Devil's in the Details */ */ */ */ */`;
      const expected = '/* /* The Devil\'s in the Nested Comments */ */';
      expect(commentDirective(input, {
        nested: 1,
      }, {nested: true}).trim()).toEqual(expected);
    });
  });

  describe('escape', () => {

    test('regex pattern with escape disabled', () => {
      const input = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
123`.trim();

      expect(commentDirective(input, {reg: 1}, {escape: false}))
        .toEqual('456');
    });

    test('literal pattern with escape enabled (default)', () => {
      const input = `
// ###[IF]reg=1;sed=/\\d{3,}/456/;
\\d{3,}`.trim();

      expect(commentDirective(input, {reg: 1}, {escape: true}))
        .toEqual('456');
    });
  });

  describe('identifier', () => {
    test('custom identifier', () => {
      const input = `
// @@@[VROOOOOOOOOM]too=fast;rm=1L;
console.log('speed racer');`.trim();

      expect(commentDirective(input, {too: 'fast'}, {identifier: '@@@[VROOOOOOOOOM]'}))
        .toEqual('');
    });

    test('different custom identifier', () => {
      const input = `
// [CUSTOM]test=1;sed=/foo/bar/;
foo`.trim();

      expect(commentDirective(input, {test: 1}, {identifier: '[CUSTOM]'}))
        .toEqual('bar');
    });
  });

  describe('loose', () => {
    test('example from README', () => {
      const input = `
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');`;

      const out1 = `
console.log('willy'); // ###[IF]loosey=goosey;rm=comment;
console.log('nilly'); // remove me!
// a directive always targets the line below
console.log('i stay'); // ###[IF]loosey=goosey;rm=line;
console.log('i dont'); // remove me!
// // ###[IF]loosey=goosey;rm=line;
console.log('only removed if loose');`;

      const out2 = `
console.log('willy');
console.log('nilly');
// a directive always targets the line below
console.log('i stay');
//`;


      const result1 = commentDirective(input, {loosey: 'goosey'}, {loose: false});
      const result2 = commentDirective(input, {loosey: 'goosey'}, {loose: true});
      expect(result1).toBe(out1);
      expect(result2).toBe(out2);
    });

  });

  describe('keepEmptyLines', () => {
    test('keepEmptyLines false (default)', () => {
      const input = `
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ###[IF]prod=1;rm=comment;
/*
console.debug('take anything but');
console.debug('my whitespace');
*/
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;

      expect(commentDirective(input, {prod: 1}, {keepEmpty: false}))
        .toEqual(`
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
    });

    test('keepEmptyLines true', () => {
      const input = `
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ###[IF]prod=1;rm=comment;
/*
console.debug('take anything but');
console.debug('my whitespace');
*/
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;

      expect(commentDirective(input, {prod: 1}, {keepEmpty: true}))
        .toEqual(`
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~





// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
    });

    test('keepEmptyLines with multiple empty sections', () => {
      const input = `
line1
// ###[IF]test=1;rm=2L;
remove1
remove2

line2`;

      const resultKeepEmpty = commentDirective(input, {test: 1}, {keepEmpty: true});
      const resultNoKeepEmpty = commentDirective(input, {test: 1}, {keepEmpty: false});

      expect(resultKeepEmpty).toEqual(`
line1




line2`);

      expect(resultNoKeepEmpty).toEqual(`
line1

line2`);
    });
  });

  describe('keepSpace', () => {
    test('keepSpace true (default)', () => {
      const input = `
<div>
  {/* ###[IF]ui=1;un=comment; */}
  {/* <UI /> */}
  <OtherJunk />
</div>`;


      expect(commentDirective(input, {ui: 1}, {
        single: [/^\s*\{\/\*\s*/, /\*\/\}/],
        multi: [/^\s*\{\/\*\s*/, /\*\/\}/],
        keepSpace: false,
      }))
        .toEqual(`
<div>
  <UI />
  <OtherJunk />
</div>`);

      expect(commentDirective(input, {ui: 1}, {
        single: [/^\s*\{\/\*\s*/, /\*\/\}/],
        multi: [/^\s*\{\/\*\s*/, /\*\/\}/],
        keepSpace: true,
      }))
        .toEqual(`
<div>
<UI />${' '}
  <OtherJunk />
</div>`);


    });


    test('keepSpace with different indentation levels', () => {
      const input = `
    // ###[IF]test=1;un=comment;
    // const indented = true;
  const lessIndented = true;`;

      expect(commentDirective(input, {test: 1}, {keepSpace: false}))
        .toEqual(`
    const indented = true;
  const lessIndented = true;`);

      expect(commentDirective(input, {test: 1}, {keepSpace: true}))
        .toEqual(`
const indented = true;
  const lessIndented = true;`);
    });
  });

  describe('keepDirective', () => {
    test('keepDirective true', () => {
      const input = `
// ###[IF]test=1;sed=/foo/bar/;
foo`.trim();

      expect(commentDirective(input, {test: 1}, {keepDirective: true}))
        .toEqual(`
// ###[IF]test=1;sed=/foo/bar/;
bar`.trim());
    });

    test('keepDirective false (default)', () => {
      const input = `
// ###[IF]test=1;sed=/foo/bar/;
foo`.trim();

      expect(commentDirective(input, {test: 1}, {keepDirective: false}))
        .toEqual('bar');
    });
  });

});

describe('Edge Cases / Other', () => {
  test('keepDirective option', () => {
    const input = `
// ###[IF]test=1;sed=/foo/bar/;
foo`.trim();

    const withKeep = commentDirective(input, {test: 1}, {keepDirective: true});
    const withoutKeep = commentDirective(input, {test: 1}, {keepDirective: false});

    expect(withKeep).toContain('###[IF]');
    expect(withoutKeep).not.toContain('###[IF]');
    expect(withKeep).toContain('bar');
    expect(withoutKeep).toContain('bar');
  });

  test('two-way directive syntax', () => {
    const input = `
// ###[IF]env=prod;un=comment;rm=comment;
// console.log('ENV: production');`.trim();

    expect(commentDirective(input, {env: 'prod'})).toEqual('console.log(\'ENV: production\');');
    expect(commentDirective(input, {env: 'dev'})).toEqual('');
  });
});
