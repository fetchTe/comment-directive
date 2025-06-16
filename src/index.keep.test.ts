/**                                                                       @about
@file: index.test.ts
@desc: keepDirective test - basically same as index.test.ts with keepDirective option
***                                                                           */
import {
  expect,
  test,
  describe,
} from 'bun:test';
import {
  commentDirective,
} from './index.ts';
import {
  type CommentOptions,
} from './index.ts';
import {
  cLike,
  python,
  html,
  css,
  bash,
  sql,
} from './lang.ts';

// -----------------------------------------------------------------------------
// @id::options
// -----------------------------------------------------------------------------
describe('options', () => {
  test('change identifier', () => {
    expect(commentDirective(`
      // @@@[YOLO]test=0;rm=line;
      remove me
      `, { test: 0 }, {identifier: '@@@[YOLO]', keepDirective: true}))
      .toEqual(`
      // @@@[YOLO]test=0;rm=line;
      `);
  });

  test('nestedComments an unholy desecration', () => {
    const UNHOLY_NESTING = `
      // ###[IF]test=0;un=comment;
      /* /* dont remove me */  */

      // ###[IF]test=0;un=comment;
      /*

      /* dont remove me */

      */

      // ###[IF]test=0;un=comment;
      /*

      // ###[IF]test=0;un=comment;
      /* /* dont remove me */ */

      */

// ###[IF]test=0;un=comment;
--------------/*

  let nested = "comments";
  /* let test = "match";  */

*/--------------
`;

    const UNHOLY_NESTING_OUT = `
      // ###[IF]test=0;un=comment;
 /* dont remove me */  

      // ###[IF]test=0;un=comment;


      /* dont remove me */



      // ###[IF]test=0;un=comment;


      // ###[IF]test=0;un=comment;
 /* dont remove me */ 



// ###[IF]test=0;un=comment;
--------------

  let nested = "comments";
  /* let test = "match";  */

--------------
`;

    expect(commentDirective(UNHOLY_NESTING,
      { test: 0 },
      {nested: true, keepDirective: true}))
      .toEqual(UNHOLY_NESTING_OUT);
  });


  test('keep empty', () => {
    expect(commentDirective(`
      // ###[IF]test=0;rm=line;
      /* throw                                                                */
      /* throw                                                                */
      `, { test: 0 }))
      .toEqual(`
      /* throw                                                                */
      `);

    expect(commentDirective(`
      // ###[IF]test=0;rm=line;
      /* throw                                                                */
      /* throw                                                                */
      `, { test: 0}, {keepEmpty: true, keepDirective: true }))
      .toEqual(`
      // ###[IF]test=0;rm=line;

      /* throw                                                                */
      `);

    expect(commentDirective(`
      // ###[IF]test=0;rm=line;
      // throw
      /* throw                                                                */
      `, { test: 0}, {keepEmpty: true, keepDirective: true }))
      .toEqual(`
      // ###[IF]test=0;rm=line;

      /* throw                                                                */
      `);

    expect(commentDirective(`
      // ###[IF]test=0;rm=comment;
      // throw
      /* throw                                                                */
      `, { test: 0}, {keepEmpty: true, keepDirective: true }))
      .toEqual(`
      // ###[IF]test=0;rm=comment;

      /* throw                                                                */
      `);


    expect(commentDirective(`
------------------

------------------
    // ###[IF]test=0;rm=comment;
    /*
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;

    let maths = 1 / 2 / 7;







    let maths = 1 / 2 / 8777;
    */
------------------

------------------

      `, { test: 0}, {keepEmpty: false, keepDirective: true }))
      .toEqual(`
------------------

------------------
    // ###[IF]test=0;rm=comment;
------------------

------------------

      `);

    expect(commentDirective(`
------------------

------------------
    // ###[IF]test=0;rm=comment;
    /*
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;

    let maths = 1 / 2 / 7;







    let maths = 1 / 2 / 8777;
    */
------------------

------------------

      `, { test: 0}, {keepEmpty: true, keepDirective: true }))
      .toEqual(`
------------------

------------------
    // ###[IF]test=0;rm=comment;














------------------

------------------

      `);


  });


  test('no keepSpace', () => {
    const SPACY = `
      // ###[IF]test=0;un=comment;
      /* throw                                                                */
      /* throw                                                                */
    `;
    // since '\s*\/\*' is the regex it eats the space
    const SPACY_NO_ADJ = `
      // ###[IF]test=0;un=comment;
 throw                                                                
      /* throw                                                                */
    `;
    const SPACY_ADJ = `
       throw
      /* throw                                                                */
    `;
    expect(commentDirective(SPACY, {test: 0}, {
      multi: [/\s*\/\*/, /\*\//],
      keepSpace: true,
      keepDirective: true,
    })).toBe(SPACY_NO_ADJ);
    expect(commentDirective(SPACY, {test: 0}, {
      multi: [/\s*\/\*/, /\*\//],
    })).toBe(SPACY_ADJ);


    const whitespace = ' '.repeat(40);
    const KEEP_THE_SPACE = `
      // ###[IF]space=1;un=comment;${whitespace}
      /*${whitespace}
      let keep = 'space';${whitespace}
      */
      // ###[IF]space=1;un=comment;${whitespace}
      // let space = 'keep';${whitespace}
    `;
    const KEEP_THE_SPACE_FALSE = `
⠐⠐⠐⠐⠐⠐//⠐###[IF]space=1;un=comment;⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐

⠐⠐⠐⠐⠐⠐let⠐keep⠐=⠐'space';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐

⠐⠐⠐⠐⠐⠐//⠐###[IF]space=1;un=comment;⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐let⠐space⠐=⠐'keep';
⠐⠐⠐⠐`;
    const KEEP_THE_SPACE_TRUE = `
⠐⠐⠐⠐⠐⠐//⠐###[IF]space=1;un=comment;⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐let⠐keep⠐=⠐'space';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐⠐⠐//⠐###[IF]space=1;un=comment;⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
let⠐space⠐=⠐'keep';⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐
⠐⠐⠐⠐`;

    expect(commentDirective(KEEP_THE_SPACE, { space: 1}, {
      keepDirective: true,
      keepSpace: true,
    }).replaceAll(' ', '⠐')).toBe(KEEP_THE_SPACE_TRUE);

    expect(commentDirective(KEEP_THE_SPACE, { space: 1}, {
      keepDirective: true,
      keepSpace: false,
    }).replaceAll(' ', '⠐')).toBe(KEEP_THE_SPACE_FALSE);


  });
});

// -----------------------------------------------------------------------------
// @id::sed
// -----------------------------------------------------------------------------
describe('sed', () => {
  // Single comment replace
  const SED_SINGLE_INPUT = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default ptag;`;

  const SED_SINGLE_FALSE_EXPECTED = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default ptag;`;

  const SED_SINGLE_TRUE_EXPECTED = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default cool;`;

  test('single comment replace - no match', () => {
    expect(commentDirective(
      SED_SINGLE_INPUT,
      { is_any: 0 },
      { keepDirective: true },
    )).toEqual(SED_SINGLE_FALSE_EXPECTED);
  });

  test('single comment replace - match', () => {
    expect(commentDirective(
      SED_SINGLE_INPUT,
      { is_any: 1 },
      { keepDirective: true },
    )).toEqual(SED_SINGLE_TRUE_EXPECTED);
  });

  // Multiple stacked directives
  const SED_STACKED_INPUT = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.txt.ptag,`;

  const SED_STACKED_FALSE_EXPECTED = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.{#}tag.ptag{+},`;

  const SED_STACKED_TRUE_EXPECTED = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.txt.ptag{+},`;

  test('multiple stacked directives - first condition', () => {
    expect(commentDirective(
      SED_STACKED_INPUT,
      { is_txt: 0 },
      { keepDirective: true },
    )).toEqual(SED_STACKED_FALSE_EXPECTED);
  });

  test('multiple stacked directives - second condition', () => {
    expect(commentDirective(
      SED_STACKED_INPUT,
      { is_txt: 1 },
      { keepDirective: true },
    )).toEqual(SED_STACKED_TRUE_EXPECTED);
  });

  // Global sed replacement
  const SED_GLOBAL_INPUT = `
    // ###[IF]debug=1;sed=/console/logger/g;
    console.log('test');
    console.warn('warning');
    function test() {
      console.error('error');
    }`;

  const SED_GLOBAL_TRUE_EXPECTED = `
    // ###[IF]debug=1;sed=/console/logger/g;
    logger.log('test');
    logger.warn('warning');
    function test() {
      logger.error('error');
    }`;

  test('global sed replacement', () => {
    expect(commentDirective(
      SED_GLOBAL_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(SED_GLOBAL_TRUE_EXPECTED);
  });

  const SED_GLOBAL_NLINES_INPUT = `
    // ###[IF]deli=1;sed=###/###+###g1L;
    let maths = 1 / 2 / 3;
    let maths = 1 / 2 / 4;
    // ###[IF]deli=1;sed=###/###+###g2L;
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`;

  const SED_GLOBAL_NLINES_EXPECTED = `
    // ###[IF]deli=1;sed=###/###+###g1L;
    let maths = 1 + 2 + 3;
    let maths = 1 / 2 / 4;
    // ###[IF]deli=1;sed=###/###+###g2L;
    let maths = 1 + 2 + 5;
    let maths = 1 + 2 + 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`;

  test('global sed replacement N lines', () => {
    expect(commentDirective(
      SED_GLOBAL_NLINES_INPUT,
      { deli: 1 },
      { delimiter: '###', keepDirective: true },
    )).toEqual(SED_GLOBAL_NLINES_EXPECTED);
  });

  // Multiline sed replacement
  const SED_MULTILINE_INPUT = `
    // ###[IF]mode=dev;sed=/old/new/2L;
    const old = 'value1';
    const old = 'value2';
    const old = 'value3';`;

  const SED_MULTILINE_EXPECTED = `
    // ###[IF]mode=dev;sed=/old/new/2L;
    const new = 'value1';
    const new = 'value2';
    const old = 'value3';`;

  test('multiline sed replacement', () => {
    expect(commentDirective(
      SED_MULTILINE_INPUT,
      { mode: 'dev' },
      { keepDirective: true },
    )).toEqual(SED_MULTILINE_EXPECTED);
  });

  // Nested sed
  const NESTED_SED_INPUT = `
    // ###[IF]un=1;un=comment;
    // ###[IF]debug=1;sed=/WORK/YOLO/;
    // ###[IF]other=1;sed=/YOLO/POLO/;
    // ###[IF]other=1;sed=/POLO/COLO/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_ALT_INPUT = `
    // ###[IF]other=1;sed=/WORK/POLO/;
    // ###[IF]other=1;sed=/POLO/YOLO/;
    // ###[IF]debug=1;sed=/YOLO/COLO/;
    // ###[IF]un=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_DIRECTIVES = `
    // ###[IF]un=1;un=comment;
    // ###[IF]debug=1;sed=/WORK/YOLO/;
    // ###[IF]other=1;sed=/YOLO/POLO/;
    // ###[IF]other=1;sed=/POLO/COLO/;`;

  const NESTED_SED_DIRECTIVES_ALT = `
    // ###[IF]other=1;sed=/WORK/POLO/;
    // ###[IF]other=1;sed=/POLO/YOLO/;
    // ###[IF]debug=1;sed=/YOLO/COLO/;
    // ###[IF]un=1;un=comment;`;

  const NESTED_SED_ELSE_EXPECTED = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_DEBUG_EXPECTED = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD YOLO");
    console.log("pretty please");`;

  const NESTED_SED_OTHER_EXPECTED = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_DEBUG_OTHER_EXPECTED = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD COLO");
    console.log("pretty please");`;
  const NESTED_SED_DEBUG_OTHER_ALT_EXPECTED = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  const NESTED_SED_DEBUG_OTHER_UN_EXPECTED = NESTED_SED_DIRECTIVES + `
    console.log("THIS SHOULD COLO");
    console.log("pretty please");`;
  const NESTED_SED_DEBUG_OTHER_UN_ALT_EXPECTED = NESTED_SED_DIRECTIVES_ALT + `
    console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  const NESTED_SED_DEBUG_ALT_EXPECTED = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`; // debug=1, other=0, un=0. debug sed applies YOLO -> COLO. other sed not active.

  const NESTED_SED_OTHER_ALT_EXPECTED = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD YOLO");
    console.log("pretty please");`; // other=1, debug=0, un=0. other sed applies WORK->POLO->YOLO. debug sed not active.

  test('multiline sed - nested', () => {
    expect(commentDirective(
      NESTED_SED_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_ELSE_EXPECTED);

    expect(commentDirective(
      NESTED_SED_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_EXPECTED);

    expect(commentDirective(
      NESTED_SED_INPUT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_OTHER_EXPECTED);

    expect(commentDirective(
      NESTED_SED_INPUT,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_OTHER_EXPECTED);

    expect(commentDirective(
      NESTED_SED_INPUT,
      {
        debug: 1, other: 1, un: 1,
      },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_OTHER_UN_EXPECTED);
  });


  test('multiline sed - nested alt', () => {
    expect(commentDirective(
      NESTED_SED_ALT_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_ALT_INPUT);

    expect(commentDirective(
      NESTED_SED_ALT_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_ALT_EXPECTED);

    expect(commentDirective(
      NESTED_SED_ALT_INPUT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_OTHER_ALT_EXPECTED);

    expect(commentDirective(
      NESTED_SED_ALT_INPUT,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_OTHER_ALT_EXPECTED);

    expect(commentDirective(
      NESTED_SED_ALT_INPUT,
      {
        debug: 1, other: 1, un: 1,
      },
      { keepDirective: true },
    )).toEqual(NESTED_SED_DEBUG_OTHER_UN_ALT_EXPECTED);
  });

  // Sed with regex flags
  const SED_FLAGS_INPUT = `
    // ###[IF]case=1;sed=/Hello/hi/i;
    Hello World`;

  const SED_FLAGS_EXPECTED = `
    // ###[IF]case=1;sed=/Hello/hi/i;
    hi World`;

  test('sed with regex flags', () => {
    expect(commentDirective(
      SED_FLAGS_INPUT,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(SED_FLAGS_EXPECTED);
  });

  // Sed with regex flags
  const SED_DELIMITER_A_INPUT = `
    // ###[IF]case=1;sed=$localhost:3000/api$api.example.com/other$;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_B_INPUT = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_C_INPUT = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%2L;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_D_INPUT = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%i2L;
    const apiUrl = 'http://localHost:3000/api';
    const apiUrl2 = 'http://locaLhost:3000/api';`;

  const SED_DELIMITER_A_EXPECTED = `
    // ###[IF]case=1;sed=$localhost:3000/api$api.example.com/other$;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_B_EXPECTED = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_C_EXPECTED = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%2L;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://api.example.com/other';`;
  const SED_DELIMITER_D_EXPECTED = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%i2L;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://api.example.com/other';`;

  test('sed with diffrent delimiter', () => {
    expect(commentDirective(
      SED_DELIMITER_A_INPUT,
      { case: 1 },
      { delimiter: '$', keepDirective: true },
    )).toEqual(SED_DELIMITER_A_EXPECTED);

    expect(commentDirective(
      SED_DELIMITER_B_INPUT,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_B_EXPECTED);

    expect(commentDirective(
      SED_DELIMITER_C_INPUT,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_C_EXPECTED);

    expect(commentDirective(
      SED_DELIMITER_D_INPUT,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_D_EXPECTED);
  });


  const SED_COMMENT_OUT_STACK_INPUT = `
// ###[IF]env=0;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]env=1;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
`;

  const SED_COMMENT_OUT_LINE_INPUT = `
// ###[IF]env=0;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
const myKoolFunction = (arg = 'logic'): number => {
  const res = 'big ' + arg;

  return res.length;
};
//#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
`;


  const SED_COMMENT_OUT_STACK_EXPECTED_0 = `
// ###[IF]env=0;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;
// ###[IF]env=1;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
// const myKoolFunction = (arg = 'logic'): number => {
//   const res = 'big ' + arg;
// 
//   return res.length;
// };
// //#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
`;


  const SED_COMMENT_OUT_LINE_EXPECTED_0 = `
// ###[IF]env=0;sed=##^(?!\\/\\/\\s)(.*)##// $1##@//#STOP;sed=##^(\\/\\/\\s)(.*)##$2##@//#STOP;
// const myKoolFunction = (arg = 'logic'): number => {
//   const res = 'big ' + arg;
// 
//   return res.length;
// };
// //#STOP

const lesserFunction = (arg = ':('): number => {
  return res.length;
};
`;

  test('sed @ stop - comment out', () => {
    const opts = {
      keepDirective: true,
      delimiter: '##',
      escape: false,
    } as const;
    const SED_CMT_OUT_STACK_0 = commentDirective(SED_COMMENT_OUT_STACK_INPUT, { env: 0 }, opts);
    const SED_CMT_OUT_LINE_0 = commentDirective(SED_COMMENT_OUT_LINE_INPUT, { env: 0 }, opts);
    const SED_CMT_OUT_STACK_1 = commentDirective(SED_COMMENT_OUT_STACK_INPUT, { env: 1 }, opts);
    const SED_CMT_OUT_LINE_1 = commentDirective(SED_COMMENT_OUT_LINE_INPUT, { env: 1 }, opts);

    // no change
    expect(SED_CMT_OUT_STACK_1).toEqual(SED_COMMENT_OUT_STACK_INPUT);
    expect(SED_CMT_OUT_LINE_1).toEqual(SED_COMMENT_OUT_LINE_INPUT);
    // comment out
    expect(SED_CMT_OUT_STACK_0).toEqual(SED_COMMENT_OUT_STACK_EXPECTED_0);
    expect(SED_CMT_OUT_LINE_0).toEqual(SED_COMMENT_OUT_LINE_EXPECTED_0);
    // reverse
    expect(commentDirective(SED_CMT_OUT_STACK_0, { env: 1 }, opts))
      .toEqual(SED_COMMENT_OUT_STACK_INPUT);
    expect(commentDirective(SED_CMT_OUT_LINE_0, { env: 1 }, opts))
      .toEqual(SED_COMMENT_OUT_LINE_INPUT);
  });
});


// -----------------------------------------------------------------------------
// @id::seq
// -----------------------------------------------------------------------------
describe('seq', () => {
  const SEQ_ALL_ACTIONS_INPUT = `

// ###[IF]seq=1;prepend=// ;shift=// ;
console.log('single line');

// ###[IF]seq=1;append= /* cool */;pop= /* cool */;
console.log('single line');

// ###[IF]seq=1;prepend=// ;shift=// ;
// ###[IF]seq=1;append= /* cool */;pop= /* cool */;
console.log('stacked');

// ###[IF]seq=1;prepend=// /@//#STOP;shift=// /@//#STOP;
const aContrivedExample = (aval = true) => {
  const aurl = 'https://my.api.com:3000'
  return {aurl, aval};
};
//#STOP


// ###[IF]seq=1;append= /* cool */ /@//#STOP;pop= /* cool */ /@//#STOP;
const aContrivedExample = (aval = true) => {
  const aurl = 'https://my.api.com:3000'
  return {aurl, aval};
};
//#STOP


// ###[IF]seq=1;unshift=###/4L;shift=###/4L;
const aContrivedExample = (aval = true) => {
  const aurl = 'https://my.api.com:3000'
  return {aurl, aval};
};


// ###[IF]seq=1;push=###/4L;pop=###/4L;
const aContrivedExample = (aval = true) => {
  const aurl = 'https://my.api.com:3000'
  return {aurl, aval};
};
`;

  test('all seq(s) should work', () => {
    const output = commentDirective(SEQ_ALL_ACTIONS_INPUT, { seq: 1 }, { keepDirective: true });
    // reverse operation
    const input = commentDirective(output, { seq: 0 }, { keepDirective: true });

    expect(output).not.toEqual(input);
    expect(input).toEqual(SEQ_ALL_ACTIONS_INPUT);
  });
  test('empty seq option should work with default delimiter', () => {
    // the last '/' it removed here since it's the default 'delimiter'
    const SEQ_EMPTY_OPT_EQ = `
// ###[IF]seq=1;append= /* cool *//;pop= /* cool *//;
console.log('test');
`;
    const SEQ_EMPTY_OPT_EQ_OUT = `
// ###[IF]seq=1;append= /* cool *//;pop= /* cool *//;
console.log('test'); /* cool */
`;

    expect(commentDirective(
      SEQ_EMPTY_OPT_EQ,
      { seq: 1 },
      { keepDirective: true },
    )).toEqual(SEQ_EMPTY_OPT_EQ_OUT);
  });

  test('empty seq option should work with non-default delimiter', () => {
    // the last '/' it removed here since it's the default 'delimiter'
    const SEQ_EMPTY_OPT_EQ = `
// ###[IF]seq=1;append= /* cool */#;pop= /* cool */#;
console.log('test');
`;
    const SEQ_EMPTY_OPT_EQ_OUT = `
// ###[IF]seq=1;append= /* cool */#;pop= /* cool */#;
console.log('test'); /* cool */
`;

    expect(commentDirective(
      SEQ_EMPTY_OPT_EQ,
      { seq: 1 },
      { keepDirective: true, delimiter: '#' },
    )).toEqual(SEQ_EMPTY_OPT_EQ_OUT);
  });

});


// -----------------------------------------------------------------------------
// @id::rm
// -----------------------------------------------------------------------------
describe('remove lines', () => {

  test('dont rm commented out directives', () => {
    const input = `
// // ###[IF]test=0;rm=comment;
// let maths = 1 / 2 / 5;
//     // ###[IF]test=0;rm=comment;
//     let maths = 1 / 2 / 5;
    `;
    expect(commentDirective(input, { test: 0 })).toEqual(input);
  });


  test('rm single comments at end of line - loose', () => {
    const input = `
console.log('willy'); // ###[IF]test=0;rm=comment;
console.log('nilly'); // remove me!
`;
    expect(commentDirective(
      input,
      { test: 0 },
      { keepDirective: true, loose: true },
    ).trim()).toEqual(`console.log('willy'); // ###[IF]test=0;rm=comment;\nconsole.log('nilly');`);

    expect(commentDirective(
      input,
      { test: 0 },
      { keepDirective: true, loose: false },
    ).trim()).toEqual(input.trim());
  });


  const RM_LINES_INPUT = `
    line1
    // ###[IF]debug=0;rm=2L;
    line2
    line3
    line4`;

  const RM_LINES_FALSE_EXPECTED = `
    line1
    // ###[IF]debug=0;rm=2L;
    line4`;

  const RM_LINES_TRUE_EXPECTED = `
    line1
    // ###[IF]debug=0;rm=2L;
    line2
    line3
    line4`;

  test('remove specific number of lines', () => {
    expect(commentDirective(
      RM_LINES_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RM_LINES_FALSE_EXPECTED);
  });

  test('remove lines - no match', () => {
    expect(commentDirective(
      RM_LINES_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RM_LINES_TRUE_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// @id::rm comments
// -----------------------------------------------------------------------------
describe('remove comments', () => {
  // No-op remove-comment directives
  const RM_COMMENT_NO_OP_INPUT = `
    // ###[IF]other=1;rm=comment;
    console.log("pretty please");`;

  const RM_COMMENT_NO_OP_EXPECTED = `
    // ###[IF]other=1;rm=comment;
    console.log("pretty please");`;

  const RM_COMMENT_NO_OP_COND_INPUT = `
    // ###[IF]other=1;rm=comment;rm=comment;
    console.log("pretty please");`;

  test('should not remove if no comment', () => {
    expect(commentDirective(
      RM_COMMENT_NO_OP_INPUT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_NO_OP_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_NO_OP_INPUT,
      { other: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_NO_OP_EXPECTED);
  });

  test('should not remove if no comment cond', () => {
    expect(commentDirective(
      RM_COMMENT_NO_OP_COND_INPUT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_NO_OP_COND_INPUT);

    expect(commentDirective(
      RM_COMMENT_NO_OP_COND_INPUT,
      { other: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_NO_OP_COND_INPUT);

  });

  // remove single-line comment
  const RM_COMMENT_SINGLE_LINE_INPUT = `
    // ###[IF]debug=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_TRUE_EXPECTED = `
    // ###[IF]debug=1;un=comment;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_FALSE_EXPECTED = `
    // ###[IF]debug=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  test('remove single-line comment', () => {
    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_TRUE_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_FALSE_EXPECTED);
  });

  // remove single-line comment with conditional sed
  const RM_COMMENT_SINGLE_LINE_COND_INPUT = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_COND_TRUE_EXPECTED = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_COND_ELSE_EXPECTED = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  test('remove single-line comment cond', () => {
    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_COND_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_COND_TRUE_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_COND_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_COND_ELSE_EXPECTED);
  });

  // remove/mod single-line comment cond nested
  const RM_COMMENT_SINGLE_LINE_NESTED_INPUT = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_NESTED_ALT_INPUT = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_NESTED_TRUE_EXPECTED = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_NESTED_ELSE_EXPECTED = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  const RM_COMMENT_SINGLE_LINE_NESTED_ELSE_OTHER_EXPECTED = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("pretty please");`;

  test('remove/mod single-line comment cond nested', () => {
    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_NESTED_TRUE_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_NESTED_ELSE_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_ALT_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(`
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_ALT_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(`
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_INPUT,
      { debug: 0, other: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_NESTED_ELSE_EXPECTED);

    expect(commentDirective(
      RM_COMMENT_SINGLE_LINE_NESTED_INPUT,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_LINE_NESTED_ELSE_OTHER_EXPECTED);
  });


  // remove/uncomment single-line inline comments
  const RM_COMMENT_INLINE_MULTI_INPUT = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RM_COMMENT_INLINE_MULTI_EXPECTED_0 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RM_COMMENT_INLINE_MULTI_EXPECTED_1 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, 3, 4, 5, 6];
    console.log("pretty please");`;

  const RM_COMMENT_INLINE_MULTI_EXPECTED_2 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, 5, 6];
    console.log("pretty please");`;

  test('remove/uncomment single-line inline', () => {
    expect(commentDirective(
      RM_COMMENT_INLINE_MULTI_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_INLINE_MULTI_EXPECTED_0);

    expect(commentDirective(
      RM_COMMENT_INLINE_MULTI_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_INLINE_MULTI_EXPECTED_1);

    expect(commentDirective(
      RM_COMMENT_INLINE_MULTI_INPUT,
      { debug: 2 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_INLINE_MULTI_EXPECTED_2);
  });

  // remove single-line multi comment
  const RM_COMMENT_SINGLE_BLOCK_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a comment */
    line2`;

  const RM_COMMENT_SINGLE_BLOCK_EXPECTED = `
    line1
    // ###[IF]clean=1;rm=comment;
    line2`;

  test('remove single-line multi comment', () => {
    expect(commentDirective(
      RM_COMMENT_SINGLE_BLOCK_INPUT,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_SINGLE_BLOCK_EXPECTED);
  });

  // remove multiline comment
  const RM_COMMENT_MULTI_BLOCK_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a
       multiline comment
       with multiple lines */
    line2`;

  const RM_COMMENT_MULTI_BLOCK_EXPECTED = `
    line1
    // ###[IF]clean=1;rm=comment;
    line2`;

  test('remove multiline comment', () => {
    expect(commentDirective(
      RM_COMMENT_MULTI_BLOCK_INPUT,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_MULTI_BLOCK_EXPECTED);

  });

  // remove inline comment
  const RM_COMMENT_INLINE_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    const x = 5; /* inline comment */ const y = 10;
    line2`;

  const RM_COMMENT_INLINE_EXPECTED = `
    line1
    // ###[IF]clean=1;rm=comment;
    const x = 5; const y = 10;
    line2`;

  test('remove inline comment', () => {
    expect(commentDirective(
      RM_COMMENT_INLINE_INPUT,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_INLINE_EXPECTED);

  });

  const RM_COMMENT_NO_MATCH_EXPECTED = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a comment */
    line2`;

  test('remove comment - no match', () => {
    expect(commentDirective(
      RM_COMMENT_SINGLE_BLOCK_INPUT,
      { clean: 0 },
      { keepDirective: true },
    )).toEqual(RM_COMMENT_NO_MATCH_EXPECTED);

  });
});

// -----------------------------------------------------------------------------
// @id::uncomment
// -----------------------------------------------------------------------------
describe('uncomment', () => {
  const UNCOMMENT_SINGLE_LINE_INPUT = `
    line1
    // ###[IF]debug=1;un=comment;
    /*console.log('debug'); */
    line2`;

  const UNCOMMENT_SINGLE_LINE_TRUE_EXPECTED = `
    line1
    // ###[IF]debug=1;un=comment;
    console.log('debug');
    line2`;

  const UNCOMMENT_SINGLE_LINE_FALSE_EXPECTED = `
    line1
    // ###[IF]debug=1;un=comment;
    /*console.log('debug'); */
    line2`;

  test('uncomment single-line comment', () => {
    expect(commentDirective(
      UNCOMMENT_SINGLE_LINE_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_SINGLE_LINE_TRUE_EXPECTED);
  });

  test('uncomment - no match', () => {
    expect(commentDirective(
      UNCOMMENT_SINGLE_LINE_INPUT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_SINGLE_LINE_FALSE_EXPECTED);
  });

  const UNCOMMENT_MULTI_LINE_INPUT = `
    line1
    // ###[IF]debug=1;un=comment;
    /*
    console.log('debug1');
    console.log('debug2');
    */
    line2`;

  const UNCOMMENT_MULTI_LINE_TRUE_EXPECTED = `
    line1
    // ###[IF]debug=1;un=comment;

    console.log('debug1');
    console.log('debug2');

    line2`;

  test('uncomment multiline comment', () => {
    expect(commentDirective(
      UNCOMMENT_MULTI_LINE_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_MULTI_LINE_TRUE_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// @id::conditional
// -----------------------------------------------------------------------------
describe('conditional with else', () => {
  const CONDITIONAL_ELSE_INPUT = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'dev-test';`;

  const CONDITIONAL_ELSE_TRUE_EXPECTED = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'production-test';`;

  const CONDITIONAL_ELSE_FALSE_EXPECTED = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'dev-live';`;

  test('if-true condition with else clause', () => {
    expect(commentDirective(
      CONDITIONAL_ELSE_INPUT,
      { mode: 'prod' },
      { keepDirective: true },
    )).toEqual(CONDITIONAL_ELSE_TRUE_EXPECTED);
  });

  test('if-false condition with else clause', () => {
    expect(commentDirective(
      CONDITIONAL_ELSE_INPUT,
      { mode: 'dev' },
      { keepDirective: true },
    )).toEqual(CONDITIONAL_ELSE_FALSE_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// rust
// -----------------------------------------------------------------------------
describe('rust', () => {
  const RUST_SED_INPUT = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    println!("Hello, Rust!");
}`;
  const RUST_SED_TRUE_EXPECTED = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    log::info!("Hello, Rust!");
}`;
  const RUST_SED_FALSE_EXPECTED = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    println!("Hello, Rust!");
}`;

  test('sed replacement with Rust comments - IF', () => {
    expect(commentDirective(
      RUST_SED_INPUT,
      { feature_x: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUST_SED_TRUE_EXPECTED);
  });

  test('sed replacement with Rust comments - ELSE', () => {
    expect(commentDirective(
      RUST_SED_INPUT,
      { feature_x: 0 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUST_SED_FALSE_EXPECTED);
  });

  const RUST_RM_COMMENT_SINGLE_INPUT = `
// ###[IF]release=1;rm=comment;
// This is a single line comment
let x = 5;`;
  const RUST_RM_COMMENT_SINGLE_EXPECTED = `
// ###[IF]release=1;rm=comment;
let x = 5;`;

  test('remove Rust single-line comment - IF', () => {
    expect(commentDirective(
      RUST_RM_COMMENT_SINGLE_INPUT,
      { release: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUST_RM_COMMENT_SINGLE_EXPECTED);
  });

  const RUST_RM_COMMENT_MULTI_INPUT = `
// ###[IF]release=1;rm=comment;
/*
  This is a
  multi-line comment
*/
let y = 10;`;
  const RUST_RM_COMMENT_MULTI_EXPECTED = `
// ###[IF]release=1;rm=comment;
let y = 10;`;

  test('remove Rust multi-line comment - IF', () => {
    expect(commentDirective(
      RUST_RM_COMMENT_MULTI_INPUT,
      { release: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUST_RM_COMMENT_MULTI_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// python
// -----------------------------------------------------------------------------
describe('python', () => {
  const PYTHON_SED_INPUT = `
# ###[IF]debug=1;sed=/print/logger.info/;
print('hello world')`;
  const PYTHON_SED_TRUE_EXPECTED = `
# ###[IF]debug=1;sed=/print/logger.info/;
logger.info('hello world')`;
  const PYTHON_SED_FALSE_EXPECTED = `
# ###[IF]debug=1;sed=/print/logger.info/;
print('hello world')`;

  test('sed replacement with Python comments - IF', () => {
    expect(commentDirective(
      PYTHON_SED_INPUT,
      { debug: 1 },
      { ...python, keepDirective: true },
    )).toEqual(PYTHON_SED_TRUE_EXPECTED);
  });

  test('sed replacement with Python comments - ELSE', () => {
    expect(commentDirective(
      PYTHON_SED_INPUT,
      { debug: 0 },
      { ...python, keepDirective: true },
    )).toEqual(PYTHON_SED_FALSE_EXPECTED);
  });

  const PYTHON_RM_COMMENT_MULTI_INPUT = `
line1
# ###[IF]clean=1;rm=comment;
"""
This is a multiline
Python docstring
"""
line2`;
  const PYTHON_RM_COMMENT_MULTI_EXPECTED = `
line1
# ###[IF]clean=1;rm=comment;
line2`;

  test('remove Python docstring comments - IF', () => {
    expect(commentDirective(
      PYTHON_RM_COMMENT_MULTI_INPUT,
      { clean: 1 },
      { ...python, keepDirective: true },
    )).toEqual(PYTHON_RM_COMMENT_MULTI_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// html
// -----------------------------------------------------------------------------
describe('html', () => {
  const HTML_SED_INPUT = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;
  const HTML_SED_IF = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="prod-server.js"></script>`;
  const HTML_SED_ELSE = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;

  test('sed replacement with HTML comments - IF', () => {
    expect(commentDirective(
      HTML_SED_INPUT,
      { prod: 1 },
      { ...html, keepDirective: true },
    )).toEqual(HTML_SED_IF);
  });

  test('sed replacement with HTML comments - ELSE', () => {
    expect(commentDirective(
      HTML_SED_INPUT,
      { prod: 0 },
      { ...html, keepDirective: true },
    )).toEqual(HTML_SED_ELSE);
  });

  const HTML_RM_COMMENT_INPUT = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
<!-- This is an HTML comment -->
</div>`;
  const HTML_RM_COMMENT_IF = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
</div>`;

  test('remove HTML comments - IF', () => {
    expect(commentDirective(
      HTML_RM_COMMENT_INPUT,
      { clean: 1 },
      { ...html, keepDirective: true },
    )).toEqual(HTML_RM_COMMENT_IF);
  });

  const HTML_COMMENT_MULTI = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_UN = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->


<script src="dev-server.js"></script>


<!-- end -->
`;
  const HTML_COMMENT_MULTI_RM = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!-- end -->
`;

  test('multi remove HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI, { prod: 0 }, { ...html, keepDirective: true }))
      .toEqual(HTML_COMMENT_MULTI_RM);
  });
  test('multi un-comment HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI, { prod: 1 }, { ...html, keepDirective: true }))
      .toEqual(HTML_COMMENT_MULTI_UN);
  });
});


// for when multi is nulled out - interal logic is diff but results should be same unless multi
describe('html - nulled', () => {
  const htmlNulled: CommentOptions = {
    single: [/\s*<!--/, /\s*-->/],
    multi: [null, null],
    keepDirective: true,
  };

  const HTML_SED_INPUT = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;
  const HTML_SED_IF = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="prod-server.js"></script>`;
  const HTML_SED_ELSE = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;

  test('sed replacement with HTML comments - IF', () => {
    expect(commentDirective(
      HTML_SED_INPUT,
      { prod: 1 },
      htmlNulled,
    )).toEqual(HTML_SED_IF);
  });

  test('sed replacement with HTML comments - ELSE', () => {
    expect(commentDirective(
      HTML_SED_INPUT,
      { prod: 0 },
      htmlNulled,
    )).toEqual(HTML_SED_ELSE);
  });

  const HTML_RM_COMMENT_INPUT = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
<!-- This is an HTML comment -->
</div>`;
  const HTML_RM_COMMENT_IF = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
</div>`;

  test('remove HTML comments - IF', () => {
    expect(commentDirective(
      HTML_RM_COMMENT_INPUT,
      { clean: 1 },
      htmlNulled,
    )).toEqual(HTML_RM_COMMENT_IF);
  });

  // should not work - as there no multi
  const HTML_COMMENT_MULTI = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_UN = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_RM = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  test('multi remove HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI, { prod: 0 }, htmlNulled))
      .toEqual(HTML_COMMENT_MULTI_RM);
  });
  test('multi un-comment HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI, { prod: 1 }, htmlNulled))
      .toEqual(HTML_COMMENT_MULTI_UN);
  });
});

// -----------------------------------------------------------------------------
// CSS
// -----------------------------------------------------------------------------
describe('CSS', () => {
  const CSS_SED_INPUT = `
body {
  /* ###[IF]theme=light;sed=/color: black/color: white/; */
  color: black;
}`;
  const CSS_SED_TRUE_EXPECTED = `
body {
  /* ###[IF]theme=light;sed=/color: black/color: white/; */
  color: white;
}`;
  const CSS_SED_FALSE_EXPECTED = `
body {
  /* ###[IF]theme=light;sed=/color: black/color: white/; */
  color: black;
}`;

  test('sed replacement with CSS comments - IF', () => {
    expect(commentDirective(
      CSS_SED_INPUT,
      { theme: 'light' },
      { ...css, keepDirective: true },
    )).toEqual(CSS_SED_TRUE_EXPECTED);
  });

  test('sed replacement with CSS comments - ELSE', () => {
    expect(commentDirective(
      CSS_SED_INPUT,
      { theme: 'other' },
      { ...css, keepDirective: true },
    )).toEqual(CSS_SED_FALSE_EXPECTED);
  });

  const CSS_RM_COMMENT_INPUT = `
/* ###[IF]minify=1;rm=comment; */
/* This is a CSS comment */
.selector {
  property: value;
}`;
  const CSS_RM_COMMENT_EXPECTED = `
/* ###[IF]minify=1;rm=comment; */
.selector {
  property: value;
}`;

  test('remove CSS comment - IF', () => {
    expect(commentDirective(
      CSS_RM_COMMENT_INPUT,
      { minify: 1 },
      { ...css, keepDirective: true },
    )).toEqual(CSS_RM_COMMENT_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// bash/shell
// -----------------------------------------------------------------------------
describe('bash/shell', () => {
  const BASH_SED_INPUT = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "dev server started"`;
  const BASH_SED_TRUE_EXPECTED = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "production server started"`;
  const BASH_SED_FALSE_EXPECTED = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "dev server started"`;

  test('sed replacement with Bash comments - IF', () => {
    expect(commentDirective(
      BASH_SED_INPUT,
      { env: 'prod' },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_SED_TRUE_EXPECTED);
  });

  test('sed replacement with Bash comments - ELSE', () => {
    expect(commentDirective(
      BASH_SED_INPUT,
      { env: 'dev' },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_SED_FALSE_EXPECTED);
  });

  const BASH_RM_COMMENT_SINGLE_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
# This is a bash comment
export VAR="value"`;
  const BASH_RM_COMMENT_SINGLE_EXPECTED = `
# ###[IF]strip_comments=1;rm=comment;
export VAR="value"`;

  test('remove Bash single-line comment - IF', () => {
    expect(commentDirective(
      BASH_RM_COMMENT_SINGLE_INPUT,
      { strip_comments: 1 },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_RM_COMMENT_SINGLE_EXPECTED);
  });

  const BASH_RM_COMMENT_MULTI_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
<<'EOF'
This is a
multi-line here-document
treated as a comment.
EOF
ls -l`;
  const BASH_RM_COMMENT_MULTI_EXPECTED = `
# ###[IF]strip_comments=1;rm=comment;
ls -l`;

  test('remove Bash multi-line here-document comment - IF', () => {
    expect(commentDirective(
      BASH_RM_COMMENT_MULTI_INPUT,
      { strip_comments: 1 },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_RM_COMMENT_MULTI_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// @id::edge cases
// -----------------------------------------------------------------------------
describe('edge cases', () => {
  const NO_MATCH_CONDITIONS_INPUT = `
// ###[IF]nonexistent=1;sed=/old/new/;
some content`;
  const NO_MATCH_CONDITIONS_EXPECTED = `
// ###[IF]nonexistent=1;sed=/old/new/;
some content`;

  test('no matching conditions', () => {
    expect(commentDirective(
      NO_MATCH_CONDITIONS_INPUT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(NO_MATCH_CONDITIONS_EXPECTED);
  });

  const WHITESPACE_ADJUST_A_INPUT = `
// ###[IF]case=1;un=comment;
  /* some content */`;
  const WHITESPACE_ADJUST_B_INPUT = `
// ###[IF]case=1;un=comment;
   /*some content*/`;
  const WHITESPACE_ADJUST_C_INPUT = `
// ###[IF]case=1;un=comment;
   /*some content
   */c`;
  const WHITESPACE_ADJUST_AB_EXPECTED = `
// ###[IF]case=1;un=comment;
   some content`;
  const WHITESPACE_ADJUST_C_EXPECTED = `
// ###[IF]case=1;un=comment;
   some content
   c`;

  test('white space adjust', () => {
    expect(commentDirective(
      WHITESPACE_ADJUST_A_INPUT,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(WHITESPACE_ADJUST_AB_EXPECTED);

    expect(commentDirective(
      WHITESPACE_ADJUST_B_INPUT,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(WHITESPACE_ADJUST_AB_EXPECTED);

    expect(commentDirective(
      WHITESPACE_ADJUST_C_INPUT,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(WHITESPACE_ADJUST_C_EXPECTED);
  });

  const COMPLEX_NESTED_INPUT = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;
/*
// ###[IF]debug=1;sed=/old/new/;
const old = 'value';
// ###[IF]debug=1;rm=2L;
*/
const result = 'final';`;
  // since the comment is removed the directives are remoevd
  const COMPLEX_NESTED_FEATURE_EXPECTED = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;
const result = 'final';`;
  const COMPLEX_NESTED_DEBUG_EXPECTED = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;

// ###[IF]debug=1;sed=/old/new/;
const new = 'value';
// ###[IF]debug=1;rm=2L;`;

  test('complex nested scenarios', () => {
    expect(commentDirective(
      COMPLEX_NESTED_INPUT,
      { noop: 1 },
      { keepDirective: true },
    )).toEqual(COMPLEX_NESTED_INPUT);

    expect(commentDirective(
      COMPLEX_NESTED_INPUT,
      { feature: 'enabled' },
      { keepDirective: true },
    )).toEqual(COMPLEX_NESTED_FEATURE_EXPECTED);

    expect(commentDirective(
      COMPLEX_NESTED_INPUT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(COMPLEX_NESTED_DEBUG_EXPECTED);
  });

  const EMPTY_LINES_PRESERVED_INPUT = `

// ###[IF]test=1;sed=/old/new/;
old value

`;
  const EMPTY_LINES_PRESERVED_EXPECTED = `

// ###[IF]test=1;sed=/old/new/;
new value

`;
  test('empty lines preserved', () => {
    expect(commentDirective(
      EMPTY_LINES_PRESERVED_INPUT,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(EMPTY_LINES_PRESERVED_EXPECTED);
  });

  const NUMERIC_STRING_VALUES_INPUT = `
// ###[IF]count=5;sed=/old/new/;
old value`;
  const NUMERIC_STRING_VALUES_EXPECTED = `
// ###[IF]count=5;sed=/old/new/;
new value`;
  test('numeric vs string values', () => {
    expect(commentDirective(
      NUMERIC_STRING_VALUES_INPUT,
      { count: 5 },
      { keepDirective: true },
    )).toEqual(NUMERIC_STRING_VALUES_EXPECTED);

    expect(commentDirective(
      NUMERIC_STRING_VALUES_INPUT,
      { count: '5' },
      { keepDirective: true },
    )).toEqual(NUMERIC_STRING_VALUES_EXPECTED);
  });

  const BOOLEAN_VALUES_INPUT = `
// ###[IF]enabled=true;sed=/off/on/;
status: off`;
  const BOOLEAN_VALUES_EXPECTED = `
// ###[IF]enabled=true;sed=/off/on/;
status: on`;
  test('boolean values', () => {
    expect(commentDirective(
      BOOLEAN_VALUES_INPUT,
      { enabled: true },
      { keepDirective: true },
    )).toEqual(BOOLEAN_VALUES_EXPECTED);
  });

  const UNDEFINED_FLAGS_INPUT = `
// ###[IF]undefined_flag=1;sed=/old/new/;
old value`;
  const UNDEFINED_FLAGS_EXPECTED = `
// ###[IF]undefined_flag=1;sed=/old/new/;
old value`;
  test('undefined flags default to no match', () => {
    expect(commentDirective(
      UNDEFINED_FLAGS_INPUT,
      {},
      { keepDirective: true },
    )).toEqual(UNDEFINED_FLAGS_EXPECTED);
  });

  const MULTIPLE_DIRECTIVES_INPUT = `
// ###[IF]first=1;sed=/a/b/;
// ###[IF]second=1;sed=/b/c/;
a value`;
  const MULTIPLE_DIRECTIVES_EXPECTED = `
// ###[IF]first=1;sed=/a/b/;
// ###[IF]second=1;sed=/b/c/;
c value`;
  test('multiple directives on same content', () => {
    expect(commentDirective(
      MULTIPLE_DIRECTIVES_INPUT,
      { first: 1, second: 1 },
      { keepDirective: true },
    )).toEqual(MULTIPLE_DIRECTIVES_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// @id::error handling
// -----------------------------------------------------------------------------
describe('error handling', () => {
  const INVALID_SYNTAX_INPUT = `
// ###[IF]invalid syntax here
content`;

  test('invalid directive syntax is ignored', () => {
    expect(commentDirective(
      INVALID_SYNTAX_INPUT,
      {},
      { keepDirective: true },
    )).toEqual(INVALID_SYNTAX_INPUT);
  });


  test('invalid remove lines syntax is ignored', () => {
    const input = `
// ###[IF]test=1;rm=invalid;
line1
line2`;
    const expected = `
// ###[IF]test=1;rm=invalid;
line1
line2`;
    expect(commentDirective(
      input,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(expected);
  });

  const BAD_WHITESPACE_INPUT = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;
  const BAD_WHITESPACE_EXPECTED = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;

  test('bad whitespace in directives', () => {
    expect(commentDirective(
      BAD_WHITESPACE_INPUT,
      { 'test ': 1 },
      { keepDirective: true },
    )).toEqual(BAD_WHITESPACE_EXPECTED);
  });

});


// -----------------------------------------------------------------------------
// @id::real-world javascriptin scenarios
// -----------------------------------------------------------------------------
describe('real-world scenarios', () => {
  const BUILD_CONFIG_SWITCHING_INPUT = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://development.api.com',
  // ###[IF]env=production;rm=1L;
  debug: true,
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
  /*verbose: true */
};`;
  const BUILD_CONFIG_SWITCHING_PROD_EXPECTED = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://production.api.com',
  // ###[IF]env=production;rm=1L;
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
};`;

  const BUILD_CONFIG_SWITCHING_DEV_EXPECTED = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://development.api.com',
  // ###[IF]env=production;rm=1L;
  debug: true,
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
  verbose: true
};`;

  test('build configuration switching', () => {
    expect(commentDirective(
      BUILD_CONFIG_SWITCHING_INPUT,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(BUILD_CONFIG_SWITCHING_PROD_EXPECTED);

    expect(commentDirective(
      BUILD_CONFIG_SWITCHING_INPUT,
      { env: 'development' },
      { keepDirective: true },
    )).toEqual(BUILD_CONFIG_SWITCHING_DEV_EXPECTED);
  });

  const COMPLEX_TEMPLATE_INPUT = `
  // @internal default/lookup value assignment
  // ###[IF]is_fg=1;un=comment;rm=comment
  [ [idG, idF],/* [fgG, fgF],*/ [lvlG, lvlF], [pluginG, pluginF], [defsG, defsF] ] = ([
    ['ID', id, '{}'], // PTAG_ID
    // ###[IF]is_fg=1;un=comment;rm=comment
/*    ['FG'], // PTAG_FG                                                        */
    // ###[IF]is_fg=1;un=comment;rm=comment
    /*['FG'], // PTAG_FG                                                        */

    ['LVL', level, 5], // PTAG_LVL
    // plugin is globalThis only; un-JSON-able
    ['PLG', pluginFn], // PTAG_PLG
    // non-primitive values that are JSON-able
    ['DEF', null, eobj], // PTAG_DEF
  ] as const).map(getEnvDefVal as any) as [
    [string, string | null], // id
    // ###[IF]is_fg=1;un=comment;rm=comment
/*    [string | null | undefined, string | null | undefined], // fg             */
    [LogLevel, LogLevel | null], // lvl
    [PluginFn<M> | null | undefined, PluginFn<M> | undefined | null], // plugin
    [Partial<DefinitionsD>, Partial<DefinitionsD | null>], // styles
  ],`;
  const COMPLEX_TEMPLATE_IS_FG_TRUE_EXPECTED = `
  // @internal default/lookup value assignment
  // ###[IF]is_fg=1;un=comment;rm=comment
  [ [idG, idF], [fgG, fgF], [lvlG, lvlF], [pluginG, pluginF], [defsG, defsF] ] = ([
    ['ID', id, '{}'], // PTAG_ID
    // ###[IF]is_fg=1;un=comment;rm=comment
    ['FG'], // PTAG_FG
    // ###[IF]is_fg=1;un=comment;rm=comment
    ['FG'], // PTAG_FG

    ['LVL', level, 5], // PTAG_LVL
    // plugin is globalThis only; un-JSON-able
    ['PLG', pluginFn], // PTAG_PLG
    // non-primitive values that are JSON-able
    ['DEF', null, eobj], // PTAG_DEF
  ] as const).map(getEnvDefVal as any) as [
    [string, string | null], // id
    // ###[IF]is_fg=1;un=comment;rm=comment
    [string | null | undefined, string | null | undefined], // fg
    [LogLevel, LogLevel | null], // lvl
    [PluginFn<M> | null | undefined, PluginFn<M> | undefined | null], // plugin
    [Partial<DefinitionsD>, Partial<DefinitionsD | null>], // styles
  ],`;

  const COMPLEX_TEMPLATE_IS_FG_FALSE_EXPECTED = `
  // @internal default/lookup value assignment
  // ###[IF]is_fg=1;un=comment;rm=comment
  [ [idG, idF], [lvlG, lvlF], [pluginG, pluginF], [defsG, defsF] ] = ([
    ['ID', id, '{}'], // PTAG_ID
    // ###[IF]is_fg=1;un=comment;rm=comment
    // ###[IF]is_fg=1;un=comment;rm=comment

    ['LVL', level, 5], // PTAG_LVL
    // plugin is globalThis only; un-JSON-able
    ['PLG', pluginFn], // PTAG_PLG
    // non-primitive values that are JSON-able
    ['DEF', null, eobj], // PTAG_DEF
  ] as const).map(getEnvDefVal as any) as [
    [string, string | null], // id
    // ###[IF]is_fg=1;un=comment;rm=comment
    [LogLevel, LogLevel | null], // lvl
    [PluginFn<M> | null | undefined, PluginFn<M> | undefined | null], // plugin
    [Partial<DefinitionsD>, Partial<DefinitionsD | null>], // styles
  ],`;


  test('complex-ish template', () => {
    expect(commentDirective(
      COMPLEX_TEMPLATE_INPUT,
      { is_fg: 1 },
      { keepDirective: true },
    )).toEqual(COMPLEX_TEMPLATE_IS_FG_TRUE_EXPECTED);

    expect(commentDirective(
      COMPLEX_TEMPLATE_INPUT,
      { is_fg: 0 },
      { keepDirective: true },
    )).toEqual(COMPLEX_TEMPLATE_IS_FG_FALSE_EXPECTED);
  });

  const FEATURE_FLAG_MANAGEMENT_INPUT = `
class MyComponent {
  render() {
    return (
      <div>
        {/* ###[IF]feature_new_ui=1;un=comment; */}
        {/* <NewUIComponent /> */}
        {/* ###[IF]feature_new_ui=1;rm=2L; */}
        <OldUIComponent />
        <LegacyStyles />
      </div>
    );
  }
}`;

  // with new UI enabled
  const FEATURE_FLAG_MANAGEMENT_NEW_UI_EXPECTED = `
class MyComponent {
  render() {
    return (
      <div>
        {/* ###[IF]feature_new_ui=1;un=comment; */}
         <NewUIComponent /> 
        {/* ###[IF]feature_new_ui=1;rm=2L; */}
      </div>
    );
  }
}`;

  // with new UI disabled
  const FEATURE_FLAG_MANAGEMENT_OLD_UI_EXPECTED = `
class MyComponent {
  render() {
    return (
      <div>
        {/* ###[IF]feature_new_ui=1;un=comment; */}
        {/* <NewUIComponent /> */}
        {/* ###[IF]feature_new_ui=1;rm=2L; */}
        <OldUIComponent />
        <LegacyStyles />
      </div>
    );
  }
}`;

  test('feature flag management', () => {
    expect(commentDirective(
      FEATURE_FLAG_MANAGEMENT_INPUT,
      { feature_new_ui: 1 },
      {
        single: [/\{\/\*s*/, /s*\*\/\}/],
        multi: [/\{\/\*/, /\*\/\}/],
        keepSpace: true,
        keepDirective: true,
      },
    )).toEqual(FEATURE_FLAG_MANAGEMENT_NEW_UI_EXPECTED);

    expect(commentDirective(
      FEATURE_FLAG_MANAGEMENT_INPUT,
      { feature_new_ui: 0 },
      {
        single: [/\{\/\*s*/, /s*\*\/\}/],
        multi: [/\{\/\*/, /\*\/\}/],
        keepSpace: true,
        keepDirective: true,
      },
    )).toEqual(FEATURE_FLAG_MANAGEMENT_OLD_UI_EXPECTED);
  });

});


// -----------------------------------------------------------------------------
// @id::Botxamples
// -----------------------------------------------------------------------------
describe('Bot Examples', () => {
  const BOT_BASIC_USAGE_INPUT = `
    // ###[IF]env=production;sed=/localhost:3000/api.example.com/;
    const apiUrl = 'http://localhost:3000/api';`;
  const BOT_BASIC_USAGE_EXPECTED = `
    // ###[IF]env=production;sed=/localhost:3000/api.example.com/;
    const apiUrl = 'http://api.example.com/api';`;

  test('Basic Usage', () => {
    expect(commentDirective(
      BOT_BASIC_USAGE_INPUT,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(BOT_BASIC_USAGE_EXPECTED);
  });

  // Supported Actions: Text Replacement

  const BOT_TEXT_REPLACE_BASIC_INPUT = `
    // ###[IF]debug=true;sed=/console.log/logger.debug/;
    console.log('Debug message');
    console.error('Error message');
    `;
  const BOT_TEXT_REPLACE_BASIC_EXPECTED = `
    // ###[IF]debug=true;sed=/console.log/logger.debug/;
    logger.debug('Debug message');
    console.error('Error message');
    `;
  test('Text Replacement - Basic', () => {
    expect(commentDirective(
      BOT_TEXT_REPLACE_BASIC_INPUT,
      { debug: true },
      { keepDirective: true },
    )).toEqual(BOT_TEXT_REPLACE_BASIC_EXPECTED);
  });

  const BOT_TEXT_REPLACE_GLOBAL_INPUT = `
    // ###[IF]prod=1;sed=/dev-/prod-/g;
    const devServer = 'dev-api.com';
    const devDatabase = 'dev-db.com';
    const devCache = 'dev-redis.com';
    `;
  const BOT_TEXT_REPLACE_GLOBAL_EXPECTED = `
    // ###[IF]prod=1;sed=/dev-/prod-/g;
    const devServer = 'prod-api.com';
    const devDatabase = 'prod-db.com';
    const devCache = 'prod-redis.com';
    `;
  test('Text Replacement - Global replacement with flags', () => {
    expect(commentDirective(
      BOT_TEXT_REPLACE_GLOBAL_INPUT,
      { prod: 1 },
      { keepDirective: true },
    )).toEqual(BOT_TEXT_REPLACE_GLOBAL_EXPECTED);
  });

  const BOT_TEXT_REPLACE_CASE_INSENSITIVE_INPUT = `
    // ###[IF]normalize=1;sed=/ERROR/error/i;
    System ERROR occurred
    Another Error detected
    `;
  const BOT_TEXT_REPLACE_CASE_INSENSITIVE_EXPECTED = `
    // ###[IF]normalize=1;sed=/ERROR/error/i;
    System error occurred
    Another Error detected
    `;
  test('Text Replacement - Case-insensitive replacement', () => {
    expect(commentDirective(
      BOT_TEXT_REPLACE_CASE_INSENSITIVE_INPUT,
      { normalize: 1 },
      { keepDirective: true },
    )).toEqual(BOT_TEXT_REPLACE_CASE_INSENSITIVE_EXPECTED);
  });

  const BOT_TEXT_REPLACE_MULTI_LINE_INPUT = `
    // ###[IF]refactor=1;sed=/oldFunction/newFunction/2L;
    const result1 = oldFunction(data);
    const result2 = oldFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
  const BOT_TEXT_REPLACE_MULTI_LINE_EXPECTED = `
    // ###[IF]refactor=1;sed=/oldFunction/newFunction/2L;
    const result1 = newFunction(data);
    const result2 = newFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
  test('Text Replacement - Multi-line replacement (2L)', () => {
    expect(commentDirective(
      BOT_TEXT_REPLACE_MULTI_LINE_INPUT,
      { refactor: 1 },
      { keepDirective: true },
    )).toEqual(BOT_TEXT_REPLACE_MULTI_LINE_EXPECTED);
  });

  // Supported Actions: Remove Lines

  const BOT_REMOVE_LINES_INPUT = `
    console.log('Always runs');
    // ###[IF]removeLogs=1;rm=3L;
    console.log('Debug line 1');
    console.log('Debug line 2');
    console.log('Debug line 3');
    console.log('This will remain');
    `;
  const BOT_REMOVE_LINES_EXPECTED = `
    console.log('Always runs');
    // ###[IF]removeLogs=1;rm=3L;
    console.log('This will remain');
    `;
  test('Remove Lines - rm=3L', () => {
    expect(commentDirective(
      BOT_REMOVE_LINES_INPUT,
      { removeLogs: 1 },
      { keepDirective: true },
    )).toEqual(BOT_REMOVE_LINES_EXPECTED);
  });

  // Supported Actions: Remove Comments

  const BOT_REMOVE_COMMENTS_INPUT = `
    // ###[IF]minify=1;rm=comment;
    /* This is a detailed explanation
       of what this function does
       and why it exists */
    function importantFunction() {
      return 'result';
    }
    `;
  const BOT_REMOVE_COMMENTS_EXPECTED = `
    // ###[IF]minify=1;rm=comment;
    function importantFunction() {
      return 'result';
    }
    `;
  test('Remove Comments - rm=comment', () => {
    expect(commentDirective(
      BOT_REMOVE_COMMENTS_INPUT,
      { minify: 1 },
      { keepDirective: true },
    )).toEqual(BOT_REMOVE_COMMENTS_EXPECTED);
  });

  // Supported Actions: Uncomment Code

  const BOT_UNCOMMENT_CODE_INPUT = `
    // ###[IF]enableFeature=1;un=comment;
    /*function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }*/`;
  const BOT_UNCOMMENT_CODE_EXPECTED = `
    // ###[IF]enableFeature=1;un=comment;
    function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }`;
  test('Uncomment Code - un=comment', () => {
    expect(commentDirective(
      BOT_UNCOMMENT_CODE_INPUT,
      { enableFeature: 1 },
      { keepDirective: true },
    )).toEqual(BOT_UNCOMMENT_CODE_EXPECTED);
  });

  // Language Support

  const BOT_LANG_RUST_INPUT = `
    fn main() {
        // ###[IF]feature_x=1;sed=/println!(/log::info!(/;
        println!("Debug message");
    }
    `;
  const BOT_LANG_RUST_EXPECTED = `
    fn main() {
        // ###[IF]feature_x=1;sed=/println!(/log::info!(/;
        log::info!("Debug message");
    }
    `;
  test('Language Support - C-like (Rust example)', () => {
    expect(commentDirective(
      BOT_LANG_RUST_INPUT,
      { feature_x: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(BOT_LANG_RUST_EXPECTED);
  });

  const BOT_LANG_PYTHON_INPUT = `
    # ###[IF]debug=1;sed=/print(/logging.info(/g;
    print('Hello world')
    def calculate():
        print('Calculating...')
    `;
  const BOT_LANG_PYTHON_EXPECTED = `
    # ###[IF]debug=1;sed=/print(/logging.info(/g;
    logging.info('Hello world')
    def calculate():
        logging.info('Calculating...')
    `;
  test('Language Support - Python example', () => {
    expect(commentDirective(
      BOT_LANG_PYTHON_INPUT,
      { debug: 1 },
      { ...python, keepDirective: true },
    )).toEqual(BOT_LANG_PYTHON_EXPECTED);
  });

  const BOT_LANG_HTML_INPUT = `
    <!-- ###[IF]prod=1;sed=/localhost/example.com/g; -->
    <script src="http://localhost:3000/api.js"></script>
    <link href="http://localhost:3000/styles.css" rel="stylesheet">
    `;
  const BOT_LANG_HTML_EXPECTED = `
    <!-- ###[IF]prod=1;sed=/localhost/example.com/g; -->
    <script src="http://example.com:3000/api.js"></script>
    <link href="http://example.com:3000/styles.css" rel="stylesheet">
    `;
  test('Language Support - HTML example', () => {
    expect(commentDirective(
      BOT_LANG_HTML_INPUT,
      { prod: 1 },
      { ...html, keepDirective: true },
    )).toEqual(BOT_LANG_HTML_EXPECTED);
  });

  const BOT_LANG_CSS_INPUT = `
    body {
      /* ###[IF]theme=dark;sed=/white/black/; */
      background-color: white;
      color: black;
    }
    `;
  const BOT_LANG_CSS_EXPECTED = `
    body {
      /* ###[IF]theme=dark;sed=/white/black/; */
      background-color: black;
      color: black;
    }
    `;
  test('Language Support - CSS example', () => {
    expect(commentDirective(
      BOT_LANG_CSS_INPUT,
      { theme: 'dark' },
      { ...css, keepDirective: true },
    )).toEqual(BOT_LANG_CSS_EXPECTED);
  });

  const BOT_LANG_BASH_INPUT = `
    #!/bin/bash
    # ###[IF]env=prod;sed=/localhost/production.server.com/;
    curl http://localhost:8080/health
    echo "Server status checked"
    `;
  const BOT_LANG_BASH_EXPECTED = `
    #!/bin/bash
    # ###[IF]env=prod;sed=/localhost/production.server.com/;
    curl http://production.server.com:8080/health
    echo "Server status checked"
    `;
  test('Language Support - Bash/Shell example', () => {
    expect(commentDirective(
      BOT_LANG_BASH_INPUT,
      { env: 'prod' },
      { ...bash, keepDirective: true },
    )).toEqual(BOT_LANG_BASH_EXPECTED);
  });

  // Advanced Examples

  const BOT_ADV_BUILD_CONFIG_INPUT = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://production.api.com',
      // ###[IF]env=production;rm=2L;
      debug: true,
      verboseLogging: true,
      // ###[IF]env=production;un=comment;rm=comment;
      // compressionEnabled: true,
      // ###[IF]env=development;un=comment;rm=comment;
      /*hotReload: true, */
    };
    `;
  const BOT_ADV_BUILD_CONFIG_DEV_EXPECTED = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://localhost:3000',
      // ###[IF]env=production;rm=2L;
      debug: true,
      verboseLogging: true,
      // ###[IF]env=production;un=comment;rm=comment;
      // ###[IF]env=development;un=comment;rm=comment;
      hotReload: true,
    };
    `;

  test('Advanced - Build Configuration Management (development)', () => {
    expect(commentDirective(
      BOT_ADV_BUILD_CONFIG_INPUT,
      { env: 'development' },
      { keepDirective: true },
    )).toEqual(BOT_ADV_BUILD_CONFIG_DEV_EXPECTED);
  });

  const BOT_ADV_BUILD_CONFIG_PROD_EXPECTED = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://production.api.com',
      // ###[IF]env=production;rm=2L;
      // ###[IF]env=production;un=comment;rm=comment;
      compressionEnabled: true,
      // ###[IF]env=development;un=comment;rm=comment;
    };
    `;

  test('Advanced - Build Configuration Management (production)', () => {
    expect(commentDirective(
      BOT_ADV_BUILD_CONFIG_INPUT,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(BOT_ADV_BUILD_CONFIG_PROD_EXPECTED);
  });

  const BOT_ADV_FEATURE_FLAG_INPUT = `
    class UserService {
      async getUser(id: string) {
        // ###[IF]cache_enabled=1;un=comment;
        /*
        const cached = await this.cache.get(id);
        if (cached) return cached;
        */
        const user = await this.database.findUser(id);

        // ###[IF]analytics=1;un=comment;rm=comment;
        // this.analytics.track('user_fetched', { userId: id });

        // ###[IF]cache_enabled=1;un=comment;
        // await this.cache.set(id, user, 3600);

        return user;
      }
    }
    `;
  const BOT_ADV_FEATURE_FLAG_CACHE_ENABLED_EXPECTED = `
    class UserService {
      async getUser(id: string) {
        // ###[IF]cache_enabled=1;un=comment;

        const cached = await this.cache.get(id);
        if (cached) return cached;

        const user = await this.database.findUser(id);

        // ###[IF]analytics=1;un=comment;rm=comment;

        // ###[IF]cache_enabled=1;un=comment;
        await this.cache.set(id, user, 3600);

        return user;
      }
    }
    `;
  test('Advanced - Feature Flag Implementation', () => {
    expect(commentDirective(
      BOT_ADV_FEATURE_FLAG_INPUT,
      { cache_enabled: 1 },
      { keepDirective: true },
    )).toEqual(BOT_ADV_FEATURE_FLAG_CACHE_ENABLED_EXPECTED);

    const BOT_ADV_FEATURE_FLAG_FULL_EXPECTED = `
    class UserService {
      async getUser(id: string) {
        // ###[IF]cache_enabled=1;un=comment;

        const cached = await this.cache.get(id);
        if (cached) return cached;

        const user = await this.database.findUser(id);

        // ###[IF]analytics=1;un=comment;rm=comment;
        this.analytics.track('user_fetched', { userId: id });

        // ###[IF]cache_enabled=1;un=comment;
        await this.cache.set(id, user, 3600);

        return user;
      }
    }
    `;
    expect(commentDirective(
      BOT_ADV_FEATURE_FLAG_INPUT,
      { cache_enabled: 1, analytics: 1 },
      { keepDirective: true },
    )).toEqual(BOT_ADV_FEATURE_FLAG_FULL_EXPECTED);
  });


  // Custom Comment Formats
  const BOT_CUSTOM_SQL_INPUT = `
    -- ###[IF]env=prod;sed=/test_db/prod_db/;
    USE test_db;
    SELECT * FROM users;
    `;
  const BOT_CUSTOM_SQL_EXPECTED = `
    -- ###[IF]env=prod;sed=/test_db/prod_db/;
    USE prod_db;
    SELECT * FROM users;
    `;
  test('Custom Comment Formats - SQL example', () => {
    expect(commentDirective(
      BOT_CUSTOM_SQL_INPUT,
      { env: 'prod' },
      { ...sql, keepDirective: true },
    )).toEqual(BOT_CUSTOM_SQL_EXPECTED);
  });

  // Error Handling
  const BOT_ERROR_UNKNOWN_ACTION_INPUT = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
  const BOT_ERROR_UNKNOWN_ACTION_EXPECTED = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
  test('Error Handling - Unknown actions are ignored', () => {
    expect(commentDirective(
      BOT_ERROR_UNKNOWN_ACTION_INPUT,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(BOT_ERROR_UNKNOWN_ACTION_EXPECTED);
  });

  const BOT_ERROR_INVALID_SED_INPUT = `
    // ###[IF]test=1;sed=invalid_pattern;
    console.log('This line remains unchanged');
    `;
  const BOT_ERROR_INVALID_SED_EXPECTED = `
    // ###[IF]test=1;sed=invalid_pattern;
    console.log('This line remains unchanged');
    `;
  test('Error Handling - Invalid sed patterns are ignored', () => {
    expect(commentDirective(
      BOT_ERROR_INVALID_SED_INPUT,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(BOT_ERROR_INVALID_SED_EXPECTED);
  });
});
