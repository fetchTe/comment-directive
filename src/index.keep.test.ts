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
  const SED_SINGLE_IN = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default ptag;`;

  const SED_SINGLE_EXPECT_IF_FALSE = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default ptag;`;

  const SED_SINGLE_EXPECT_IF_TRUE = `
    // ###[IF]is_any=1;sed=/ptag/cool/;
    export default cool;`;

  test('single comment replace - no match', () => {
    expect(commentDirective(
      SED_SINGLE_IN,
      { is_any: 0 },
      { keepDirective: true },
    )).toEqual(SED_SINGLE_EXPECT_IF_FALSE);
  });

  test('single comment replace - match', () => {
    expect(commentDirective(
      SED_SINGLE_IN,
      { is_any: 1 },
      { keepDirective: true },
    )).toEqual(SED_SINGLE_EXPECT_IF_TRUE);
  });

  // Multiple stacked directives
  const SED_STACKED_IN = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.txt.ptag,`;

  const SED_STACKED_EXPECT_IF_TXT_FALSE = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.{#}tag.ptag{+},`;

  const SED_STACKED_EXPECT_IF_TXT_TRUE = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.txt.ptag{+},`;

  test('multiple stacked directives - first condition', () => {
    expect(commentDirective(
      SED_STACKED_IN,
      { is_txt: 0 },
      { keepDirective: true },
    )).toEqual(SED_STACKED_EXPECT_IF_TXT_FALSE);
  });

  test('multiple stacked directives - second condition', () => {
    expect(commentDirective(
      SED_STACKED_IN,
      { is_txt: 1 },
      { keepDirective: true },
    )).toEqual(SED_STACKED_EXPECT_IF_TXT_TRUE);
  });

  // Global sed replacement
  const SED_GLOBAL_IN = `
    // ###[IF]debug=1;sed=/console/logger/g;
    console.log('test');
    console.warn('warning');
    function test() {
      console.error('error');
    }`;

  const SED_GLOBAL_IF = `
    // ###[IF]debug=1;sed=/console/logger/g;
    logger.log('test');
    logger.warn('warning');
    function test() {
      logger.error('error');
    }`;

  test('global sed replacement', () => {
    expect(commentDirective(
      SED_GLOBAL_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(SED_GLOBAL_IF);
  });

  test('global sed replacement N lines', () => {
    expect(commentDirective(`
    // ###[IF]deli=1;sed=###/###+###g1L;
    let maths = 1 / 2 / 3;
    let maths = 1 / 2 / 4;
    // ###[IF]deli=1;sed=###/###+###g2L;
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`, {deli: 1}, {delimiter: '###', keepDirective: true})).toEqual(`
    // ###[IF]deli=1;sed=###/###+###g1L;
    let maths = 1 + 2 + 3;
    let maths = 1 / 2 / 4;
    // ###[IF]deli=1;sed=###/###+###g2L;
    let maths = 1 + 2 + 5;
    let maths = 1 + 2 + 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`);
  });

  // Multiline sed replacement
  const SED_MULTILINE_IN = `
    // ###[IF]mode=dev;sed=/old/new/2L;
    const old = 'value1';
    const old = 'value2';
    const old = 'value3';`;

  const SED_MULTILINE_IF = `
    // ###[IF]mode=dev;sed=/old/new/2L;
    const new = 'value1';
    const new = 'value2';
    const old = 'value3';`;

  test('multiline sed replacement', () => {
    expect(commentDirective(
      SED_MULTILINE_IN,
      { mode: 'dev' },
      { keepDirective: true },
    )).toEqual(SED_MULTILINE_IF);
  });

  // Nested sed
  const NESTED_SED_IN = `
    // ###[IF]un=1;un=comment;
    // ###[IF]debug=1;sed=/WORK/YOLO/;
    // ###[IF]other=1;sed=/YOLO/POLO/;
    // ###[IF]other=1;sed=/POLO/COLO/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_IN_ALT = `
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

  const NESTED_SED_EXPECT_ELSE = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD YOLO");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_OTHER = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG_OTHER = NESTED_SED_DIRECTIVES + `
    // console.log("THIS SHOULD COLO");
    console.log("pretty please");`;
  const NESTED_SED_EXPECT_IF_DEBUG_OTHER_ALT = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN = NESTED_SED_DIRECTIVES + `
    console.log("THIS SHOULD COLO");
    console.log("pretty please");`;
  const NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN_ALT = NESTED_SED_DIRECTIVES_ALT + `
    console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG_ALT = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`; // debug=1, other=0, un=0. debug sed applies YOLO -> COLO. other sed not active.

  const NESTED_SED_EXPECT_IF_OTHER_ALT = NESTED_SED_DIRECTIVES_ALT + `
    // console.log("THIS SHOULD YOLO");
    console.log("pretty please");`; // other=1, debug=0, un=0. other sed applies WORK->POLO->YOLO. debug sed not active.

  test('multiline sed - nested', () => {
    expect(commentDirective(
      NESTED_SED_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_ELSE);
    expect(commentDirective(
      NESTED_SED_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG);
    expect(commentDirective(
      NESTED_SED_IN,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_OTHER);
    expect(commentDirective(
      NESTED_SED_IN,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER);
    expect(commentDirective(
      NESTED_SED_IN,
      {
        debug: 1, other: 1, un: 1,
      },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN);
  });

  test('multiline sed - nested alt', () => {
    expect(commentDirective(
      NESTED_SED_IN_ALT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_IN_ALT);
    expect(commentDirective(
      NESTED_SED_IN_ALT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG_ALT);
    expect(commentDirective(
      NESTED_SED_IN_ALT,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_OTHER_ALT);

    expect(commentDirective(
      NESTED_SED_IN_ALT,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER_ALT);
    expect(commentDirective(
      NESTED_SED_IN_ALT,
      {
        debug: 1, other: 1, un: 1,
      },
      { keepDirective: true },
    )).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN_ALT);
  });

  // Sed with regex flags
  const SED_FLAGS_IN = `
    // ###[IF]case=1;sed=/Hello/hi/i;
    Hello World`;

  const SED_FLAGS_IF = `
    // ###[IF]case=1;sed=/Hello/hi/i;
    hi World`;

  test('sed with regex flags', () => {
    expect(commentDirective(
      SED_FLAGS_IN,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(SED_FLAGS_IF);
  });

  // Sed with regex flags
  const SED_DELIMITER_IN_A = `
    // ###[IF]case=1;sed=$localhost:3000/api$api.example.com/other$;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_IN_B = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_IN_C = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%2L;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_IN_D = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%i2L;
    const apiUrl = 'http://localHost:3000/api';
    const apiUrl2 = 'http://locaLhost:3000/api';`;

  const SED_DELIMITER_IF = `
    // ###[IF]case=1;sed=$localhost:3000/api$api.example.com/other$;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_IF_B = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_IF_C = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%2L;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://api.example.com/other';`;
  const SED_DELIMITER_IF_D = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%i2L;
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://api.example.com/other';`;

  test('sed with diffrent delimiter', () => {
    expect(commentDirective(
      SED_DELIMITER_IN_A,
      { case: 1 },
      { delimiter: '$', keepDirective: true },
    )).toEqual(SED_DELIMITER_IF);
    expect(commentDirective(
      SED_DELIMITER_IN_B,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_IF_B);
    expect(commentDirective(
      SED_DELIMITER_IN_C,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_IF_C);
    expect(commentDirective(
      SED_DELIMITER_IN_D,
      { case: 1 },
      { delimiter: '%%%', keepDirective: true },
    )).toEqual(SED_DELIMITER_IF_D);
  });


  test('sed @ stop - comment out', () => {
    const SED_CMT_OUT_STACK = `
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

    const SED_CMT_OUT_LINE = `
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


    const SED_CMT_OUT_EXPECT_0 = `
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


    const SED_CMT_OUT_LINE_EXPECT_0 = `
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

    const opts = {
      keepDirective: true,
      delimiter: '##',
      escape: false,
    } as const;
    const SED_CMT_OUT_STACK_0 = commentDirective(SED_CMT_OUT_STACK, {env: 0}, opts);
    const SED_CMT_OUT_LINE_0 = commentDirective(SED_CMT_OUT_LINE, {env: 0}, opts);
    const SED_CMT_OUT_STACK_1 = commentDirective(SED_CMT_OUT_STACK, {env: 1}, opts);
    const SED_CMT_OUT_LINE_1 = commentDirective(SED_CMT_OUT_LINE, {env: 1}, opts);

    // no change
    expect(SED_CMT_OUT_STACK_1).toEqual(SED_CMT_OUT_STACK);
    expect(SED_CMT_OUT_LINE_1).toEqual(SED_CMT_OUT_LINE);
    // comment out
    expect(SED_CMT_OUT_STACK_0).toEqual(SED_CMT_OUT_EXPECT_0);
    expect(SED_CMT_OUT_LINE_0).toEqual(SED_CMT_OUT_LINE_EXPECT_0);
    // reverse
    expect(commentDirective(SED_CMT_OUT_STACK_0, {env: 1}, opts))
      .toEqual(SED_CMT_OUT_STACK);
    expect(commentDirective(SED_CMT_OUT_LINE_0, {env: 1}, opts))
      .toEqual(SED_CMT_OUT_LINE);
  });


});


// -----------------------------------------------------------------------------
// @id::seq
// -----------------------------------------------------------------------------
describe('seq', () => {
  const SEQ_INPUT = `

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
    const output = commentDirective(SEQ_INPUT, { seq: 1 }, { keepDirective: true });
    // reverse operation
    const input = commentDirective(output, { seq: 0 }, { keepDirective: true });
    expect(output).not.toEqual(input);
    expect(input).toEqual(SEQ_INPUT);
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
    expect(commentDirective(input, { test: 0 }, {keepDirective: true, loose: true}).trim())
      .toEqual(`console.log('willy'); // ###[IF]test=0;rm=comment;\nconsole.log('nilly');`);
    expect(commentDirective(input,
      { test: 0 },
      {keepDirective: true, loose: false}).trim())
      .toEqual(input.trim());
  });


  const RL_IN = `
    line1
    // ###[IF]debug=0;rm=2L;
    line2
    line3
    line4`;

  const RL_EXPECT_IF_FALSE = `
    line1
    // ###[IF]debug=0;rm=2L;
    line4`;

  const RL_EXPECT_IF_TRUE = `
    line1
    // ###[IF]debug=0;rm=2L;
    line2
    line3
    line4`;

  test('remove specific number of lines', () => {
    expect(commentDirective(
      RL_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RL_EXPECT_IF_FALSE);
  });

  test('remove lines - no match', () => {
    expect(commentDirective(
      RL_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RL_EXPECT_IF_TRUE);
  });
});

// -----------------------------------------------------------------------------
// @id::rm comments
// -----------------------------------------------------------------------------
describe('remove comments', () => {
  // No-op remove-comment directives
  const RC_NOPE_IN = `
    // ###[IF]other=1;rm=comment;
    console.log("pretty please");`;

  const RC_NOPE_IF = `
    // ###[IF]other=1;rm=comment;
    console.log("pretty please");`;

  const RC_NOPE_COND_IN = `
    // ###[IF]other=1;rm=comment;rm=comment;
    console.log("pretty please");`;

  test('should not remove if no comment', () => {
    expect(commentDirective(
      RC_NOPE_IN,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(RC_NOPE_IF);
    expect(commentDirective(
      RC_NOPE_IN,
      { other: 0 },
      { keepDirective: true },
    )).toEqual(RC_NOPE_IF);
  });

  test('should not remove if no comment cond', () => {
    expect(commentDirective(
      RC_NOPE_COND_IN,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(RC_NOPE_COND_IN);
    expect(commentDirective(
      RC_NOPE_COND_IN,
      { other: 0 },
      { keepDirective: true },
    )).toEqual(RC_NOPE_COND_IN);

  });

  // remove single-line comment
  const RC_LINE_IN = `
    // ###[IF]debug=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_EXPECT_IF_TRUE = `
    // ###[IF]debug=1;un=comment;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_EXPECT_IF_FALSE = `
    // ###[IF]debug=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  test('remove single-line comment', () => {
    expect(commentDirective(
      RC_LINE_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RC_LINE_EXPECT_IF_TRUE);
    expect(commentDirective(
      RC_LINE_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RC_LINE_EXPECT_IF_FALSE);
  });

  // remove single-line comment with conditional sed
  const RC_LINE_COND_IN = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_COND_IF_TRUE = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_COND_ELSE = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  test('remove single-line comment cond', () => {
    expect(commentDirective(
      RC_LINE_COND_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RC_LINE_COND_IF_TRUE);
    expect(commentDirective(
      RC_LINE_COND_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RC_LINE_COND_ELSE);
  });

  // remove/mod single-line comment cond nested
  const RC_LINE_NEST_IN = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_IN_ALT = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_IF_TRUE = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_ELSE = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_ELSE_OTHER = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    console.log("pretty please");`;

  test('remove/mod single-line comment cond nested', () => {
    expect(commentDirective(
      RC_LINE_NEST_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RC_LINE_NEST_EXPECT_IF_TRUE);
    expect(commentDirective(
      RC_LINE_NEST_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RC_LINE_NEST_EXPECT_ELSE);
    expect(commentDirective(
      RC_LINE_NEST_IN_ALT,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(`
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`);
    expect(commentDirective(
      RC_LINE_NEST_IN_ALT,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(`
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`);

    expect(commentDirective(
      RC_LINE_NEST_IN,
      { debug: 0, other: 0 },
      { keepDirective: true },
    )).toEqual(RC_LINE_NEST_EXPECT_ELSE);
    expect(commentDirective(
      RC_LINE_NEST_IN,
      { debug: 1, other: 1 },
      { keepDirective: true },
    )).toEqual(RC_LINE_NEST_EXPECT_ELSE_OTHER);
  });


  // remove/uncomment single-line inline comments
  const RC_INLINE_MULTI_IN = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_0 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_1 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, 3, 4, 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_2 = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, 5, 6];
    console.log("pretty please");`;

  test('remove/uncomment single-line inline', () => {
    expect(commentDirective(
      RC_INLINE_MULTI_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(RC_INLINE_EXPECT_IF_0);
    expect(commentDirective(
      RC_INLINE_MULTI_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(RC_INLINE_EXPECT_IF_1);
    expect(commentDirective(
      RC_INLINE_MULTI_IN,
      { debug: 2 },
      { keepDirective: true },
    )).toEqual(RC_INLINE_EXPECT_IF_2);
  });

  // remove single-line multi comment
  const RC_SINGLE_IN = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a comment */
    line2`;

  const RC_SINGLE_IF = `
    line1
    // ###[IF]clean=1;rm=comment;
    line2`;

  test('remove single-line multi comment', () => {
    expect(commentDirective(
      RC_SINGLE_IN,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RC_SINGLE_IF);
  });

  // remove multiline comment
  const RC_MULTI_IN = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a
       multiline comment
       with multiple lines */
    line2`;

  const RC_MULTI_IF = `
    line1
    // ###[IF]clean=1;rm=comment;
    line2`;

  test('remove multiline comment', () => {
    expect(commentDirective(
      RC_MULTI_IN,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RC_MULTI_IF);

  });

  // remove inline comment
  const RC_INLINE_IN = `
    line1
    // ###[IF]clean=1;rm=comment;
    const x = 5; /* inline comment */ const y = 10;
    line2`;

  const RC_INLINE_IF = `
    line1
    // ###[IF]clean=1;rm=comment;
    const x = 5; const y = 10;
    line2`;

  test('remove inline comment', () => {
    expect(commentDirective(
      RC_INLINE_IN,
      { clean: 1 },
      { keepDirective: true },
    )).toEqual(RC_INLINE_IF);

  });

  test('remove comment - no match', () => {
    const NO_MATCH_IF = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a comment */
    line2`;
    expect(commentDirective(
      RC_SINGLE_IN,
      { clean: 0 },
      { keepDirective: true },
    )).toEqual(NO_MATCH_IF);

  });
});

// -----------------------------------------------------------------------------
// @id::uncomment
// -----------------------------------------------------------------------------
describe('uncomment', () => {
  const UNCOMMENT_SINGLE_IN = `
    line1
    // ###[IF]debug=1;un=comment;
    /*console.log('debug'); */
    line2`;

  const UNCOMMENT_SINGLE_EXPECT_IF_TRUE = `
    line1
    // ###[IF]debug=1;un=comment;
    console.log('debug');
    line2`;

  const UNCOMMENT_SINGLE_EXPECT_IF_FALSE = `
    line1
    // ###[IF]debug=1;un=comment;
    /*console.log('debug'); */
    line2`;

  test('uncomment single-line comment', () => {
    expect(commentDirective(
      UNCOMMENT_SINGLE_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_SINGLE_EXPECT_IF_TRUE);
  });

  test('uncomment - no match', () => {
    expect(commentDirective(
      UNCOMMENT_SINGLE_IN,
      { debug: 0 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_SINGLE_EXPECT_IF_FALSE);
  });

  const UNCOMMENT_MULTI_IN = `
    line1
    // ###[IF]debug=1;un=comment;
    /*
    console.log('debug1');
    console.log('debug2');
    */
    line2`;

  const UNCOMMENT_MULTI_EXPECT_IF_TRUE = `
    line1
    // ###[IF]debug=1;un=comment;

    console.log('debug1');
    console.log('debug2');

    line2`;

  test('uncomment multiline comment', () => {
    expect(commentDirective(
      UNCOMMENT_MULTI_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(UNCOMMENT_MULTI_EXPECT_IF_TRUE);
  });
});


// -----------------------------------------------------------------------------
// @id::conditional
// -----------------------------------------------------------------------------
describe('conditional with else', () => {
  const COND_ELSE_IN = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'dev-test';`;

  const COND_ELSE_EXPECT_IF_TRUE = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'production-test';`;

  const COND_ELSE_EXPECT_IF_FALSE = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'dev-live';`;

  test('if-true condition with else clause', () => {
    expect(commentDirective(
      COND_ELSE_IN,
      { mode: 'prod' },
      { keepDirective: true },
    )).toEqual(COND_ELSE_EXPECT_IF_TRUE);
  });

  test('if-false condition with else clause', () => {
    expect(commentDirective(
      COND_ELSE_IN,
      { mode: 'dev' },
      { keepDirective: true },
    )).toEqual(COND_ELSE_EXPECT_IF_FALSE);
  });
});


// -----------------------------------------------------------------------------
// rusty javascript
// -----------------------------------------------------------------------------
describe('rusty javascript', () => {
  const RUSTY_JS_SED_INPUT = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    println!("Hello, Rust!");
}`;
  const RUSTY_JS_SED_IF = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    log::info!("Hello, Rust!");
}`;
  const RUSTY_JS_SED_ELSE = `
fn main() {
    // ###[IF]feature_x=1;sed=/println!/log::info!/;
    println!("Hello, Rust!");
}`;

  test('sed replacement with Rust comments - IF', () => {
    expect(commentDirective(
      RUSTY_JS_SED_INPUT,
      { feature_x: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUSTY_JS_SED_IF);
  });

  test('sed replacement with Rust comments - ELSE', () => {
    expect(commentDirective(
      RUSTY_JS_SED_INPUT,
      { feature_x: 0 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUSTY_JS_SED_ELSE);
  });

  const RUSTY_JS_RM_COMMENT_SINGLE_INPUT = `
// ###[IF]release=1;rm=comment;
// This is a single line comment
let x = 5;`;
  const RUSTY_JS_RM_COMMENT_SINGLE_IF = `
// ###[IF]release=1;rm=comment;
let x = 5;`;

  test('remove Rust single-line comment - IF', () => {
    expect(commentDirective(
      RUSTY_JS_RM_COMMENT_SINGLE_INPUT,
      { release: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUSTY_JS_RM_COMMENT_SINGLE_IF);
  });

  const RUSTY_JS_RM_COMMENT_MULTI_INPUT = `
// ###[IF]release=1;rm=comment;
/*
  This is a
  multi-line comment
*/
let y = 10;`;
  const RUSTY_JS_RM_COMMENT_MULTI_IF = `
// ###[IF]release=1;rm=comment;
let y = 10;`;

  test('remove Rust multi-line comment - IF', () => {
    expect(commentDirective(
      RUSTY_JS_RM_COMMENT_MULTI_INPUT,
      { release: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(RUSTY_JS_RM_COMMENT_MULTI_IF);
  });
});

// -----------------------------------------------------------------------------
// python
// -----------------------------------------------------------------------------
describe('python', () => {
  const PY_SED_INPUT = `
# ###[IF]debug=1;sed=/print/logger.info/;
print('hello world')`;
  const PY_SED_IF = `
# ###[IF]debug=1;sed=/print/logger.info/;
logger.info('hello world')`;
  const PY_SED_ELSE = `
# ###[IF]debug=1;sed=/print/logger.info/;
print('hello world')`;

  test('sed replacement with Python comments - IF', () => {
    expect(commentDirective(
      PY_SED_INPUT,
      { debug: 1 },
      { ...python, keepDirective: true },
    )).toEqual(PY_SED_IF);
  });

  test('sed replacement with Python comments - ELSE', () => {
    expect(commentDirective(
      PY_SED_INPUT,
      { debug: 0 },
      { ...python, keepDirective: true },
    )).toEqual(PY_SED_ELSE);
  });

  const PY_RM_COMMENT_MULTI_INPUT = `
line1
# ###[IF]clean=1;rm=comment;
"""
This is a multiline
Python docstring
"""
line2`;
  const PY_RM_COMMENT_MULTI_IF = `
line1
# ###[IF]clean=1;rm=comment;
line2`;

  test('remove Python docstring comments - IF', () => {
    expect(commentDirective(
      PY_RM_COMMENT_MULTI_INPUT,
      { clean: 1 },
      { ...python, keepDirective: true },
    )).toEqual(PY_RM_COMMENT_MULTI_IF);
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
  const CSS_SED_IF = `
body {
  /* ###[IF]theme=light;sed=/color: black/color: white/; */
  color: white;
}`;
  const CSS_SED_ELSE = `
body {
  /* ###[IF]theme=light;sed=/color: black/color: white/; */
  color: black;
}`;

  test('sed replacement with CSS comments - IF', () => {
    expect(commentDirective(
      CSS_SED_INPUT,
      { theme: 'light' },
      { ...css, keepDirective: true },
    )).toEqual(CSS_SED_IF);
  });

  test('sed replacement with CSS comments - ELSE', () => {
    expect(commentDirective(
      CSS_SED_INPUT,
      { theme: 'other' },
      { ...css, keepDirective: true },
    )).toEqual(CSS_SED_ELSE);
  });

  const CSS_RM_COMMENT_INPUT = `
/* ###[IF]minify=1;rm=comment; */
/* This is a CSS comment */
.selector {
  property: value;
}`;
  const CSS_RM_COMMENT_IF = `
/* ###[IF]minify=1;rm=comment; */
.selector {
  property: value;
}`;

  test('remove CSS comment - IF', () => {
    expect(commentDirective(
      CSS_RM_COMMENT_INPUT,
      { minify: 1 },
      { ...css, keepDirective: true },
    )).toEqual(CSS_RM_COMMENT_IF);
  });
});

// -----------------------------------------------------------------------------
// bash/shell
// -----------------------------------------------------------------------------
describe('bash/shell', () => {
  const BASH_SED_INPUT = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "dev server started"`;
  const BASH_SED_IF = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "production server started"`;
  const BASH_SED_ELSE = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "dev server started"`;

  test('sed replacement with Bash comments - IF', () => {
    expect(commentDirective(
      BASH_SED_INPUT,
      { env: 'prod' },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_SED_IF);
  });

  test('sed replacement with Bash comments - ELSE', () => {
    expect(commentDirective(
      BASH_SED_INPUT,
      { env: 'dev' },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_SED_ELSE);
  });

  const BASH_RM_COMMENT_SINGLE_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
# This is a bash comment
export VAR="value"`;
  const BASH_RM_COMMENT_SINGLE_IF = `
# ###[IF]strip_comments=1;rm=comment;
export VAR="value"`;

  test('remove Bash single-line comment - IF', () => {
    expect(commentDirective(
      BASH_RM_COMMENT_SINGLE_INPUT,
      { strip_comments: 1 },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_RM_COMMENT_SINGLE_IF);
  });

  const BASH_RM_COMMENT_MULTI_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
<<'EOF'
This is a
multi-line here-document
treated as a comment.
EOF
ls -l`;
  const BASH_RM_COMMENT_MULTI_IF = `
# ###[IF]strip_comments=1;rm=comment;
ls -l`;

  test('remove Bash multi-line here-document comment - IF', () => {
    expect(commentDirective(
      BASH_RM_COMMENT_MULTI_INPUT,
      { strip_comments: 1 },
      { ...bash, keepDirective: true },
    )).toEqual(BASH_RM_COMMENT_MULTI_IF);
  });
});


// -----------------------------------------------------------------------------
// @id::edge cases
// -----------------------------------------------------------------------------
describe('edge cases', () => {
  test('no matching conditions', () => {
    const JS_NO_MATCH_IN = `
// ###[IF]nonexistent=1;sed=/old/new/;
some content`;
    const JS_NO_MATCH_ELSE = `
// ###[IF]nonexistent=1;sed=/old/new/;
some content`;
    expect(commentDirective(
      JS_NO_MATCH_IN,
      { other: 1 },
      { keepDirective: true },
    )).toEqual(JS_NO_MATCH_ELSE);
  });

  test('white space adjust', () => {
    const WHITE_SPACE_IN = `
// ###[IF]case=1;un=comment;
  /* some content */`;
    const WHITE_SPACE_IN_B = `
// ###[IF]case=1;un=comment;
   /*some content*/`;
    const WHITE_SPACE_IN_C = `
// ###[IF]case=1;un=comment;
   /*some content
   */c`;
    const JS_NO_MATCH_ELSE = `
// ###[IF]case=1;un=comment;
   some content`;
    const JS_NO_MATCH_ELSE_C = `
// ###[IF]case=1;un=comment;
   some content
   c`;

    expect(commentDirective(
      WHITE_SPACE_IN,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(JS_NO_MATCH_ELSE);
    expect(commentDirective(
      WHITE_SPACE_IN_B,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(JS_NO_MATCH_ELSE);
    expect(commentDirective(
      WHITE_SPACE_IN_C,
      { case: 1 },
      { keepDirective: true },
    )).toEqual(JS_NO_MATCH_ELSE_C);
  });

  test('complex nested scenarios', () => {
    const JS_COMPLEX_IN = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;
/*
// ###[IF]debug=1;sed=/old/new/;
const old = 'value';
// ###[IF]debug=1;rm=2L;
*/
const result = 'final';`;
    // since the comment is removed the directives are remoevd
    const JS_COMPLEX_IF_FEATURE = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;
const result = 'final';`;
    const JS_COMPLEX_IF_DEBUG = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;

// ###[IF]debug=1;sed=/old/new/;
const new = 'value';
// ###[IF]debug=1;rm=2L;`;
    expect(commentDirective(
      JS_COMPLEX_IN,
      { noop: 1 },
      { keepDirective: true },
    )).toEqual(JS_COMPLEX_IN);
    expect(commentDirective(
      JS_COMPLEX_IN,
      { feature: 'enabled' },
      { keepDirective: true },
    )).toEqual(JS_COMPLEX_IF_FEATURE);
    expect(commentDirective(
      JS_COMPLEX_IN,
      { debug: 1 },
      { keepDirective: true },
    )).toEqual(JS_COMPLEX_IF_DEBUG);
  });

  test('empty lines preserved', () => {
    const JS_EMPTY_LINES_IN = `

// ###[IF]test=1;sed=/old/new/;
old value

`;
    const JS_EMPTY_LINES_IF = `

// ###[IF]test=1;sed=/old/new/;
new value

`;
    expect(commentDirective(
      JS_EMPTY_LINES_IN,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(JS_EMPTY_LINES_IF);
  });

  test('numeric vs string values', () => {
    const JS_NUMERIC_IF_IN = `
// ###[IF]count=5;sed=/old/new/;
old value`;
    const JS_NUMERIC_IF = `
// ###[IF]count=5;sed=/old/new/;
new value`;
    expect(commentDirective(
      JS_NUMERIC_IF_IN,
      { count: 5 },
      { keepDirective: true },
    )).toEqual(JS_NUMERIC_IF);
    expect(commentDirective(
      JS_NUMERIC_IF_IN,
      { count: '5' },
      { keepDirective: true },
    )).toEqual(JS_NUMERIC_IF);
  });

  test('boolean values', () => {
    const JS_BOOLEAN_IF_IN = `
// ###[IF]enabled=true;sed=/off/on/;
status: off`;
    const JS_BOOLEAN_IF = `
// ###[IF]enabled=true;sed=/off/on/;
status: on`;
    expect(commentDirective(
      JS_BOOLEAN_IF_IN,
      { enabled: true },
      { keepDirective: true },
    )).toEqual(JS_BOOLEAN_IF);
  });

  test('undefined flags default to no match', () => {
    const JS_UNDEFINED_ELSE_IN = `
// ###[IF]undefined_flag=1;sed=/old/new/;
old value`;
    const JS_UNDEFINED_ELSE = `
// ###[IF]undefined_flag=1;sed=/old/new/;
old value`;
    expect(commentDirective(
      JS_UNDEFINED_ELSE_IN,
      {},
      { keepDirective: true },
    )).toEqual(JS_UNDEFINED_ELSE);
  });

  test('multiple directives on same content', () => {
    const JS_MULTIPLE_IF_IN = `
// ###[IF]first=1;sed=/a/b/;
// ###[IF]second=1;sed=/b/c/;
a value`;
    const JS_MULTIPLE_IF = `
// ###[IF]first=1;sed=/a/b/;
// ###[IF]second=1;sed=/b/c/;
c value`;
    expect(commentDirective(
      JS_MULTIPLE_IF_IN,
      { first: 1, second: 1 },
      { keepDirective: true },
    )).toEqual(JS_MULTIPLE_IF);
  });
});


// -----------------------------------------------------------------------------
// @id::error handling
// -----------------------------------------------------------------------------
describe('error handling', () => {
  const INVALID_SYNTAX_IN = `
// ###[IF]invalid syntax here
content`;

  test('invalid directive syntax is ignored', () => {
    expect(commentDirective(
      INVALID_SYNTAX_IN,
      {},
      { keepDirective: true },
    )).toEqual(INVALID_SYNTAX_IN);
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

  test('bad whitespace in directives', () => {
    const JS_WHITESPACE_IF_IN = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;
    const JS_WHITESPACE_IF = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;
    expect(commentDirective(
      JS_WHITESPACE_IF_IN,
      { 'test ': 1 },
      { keepDirective: true },
    )).toEqual(JS_WHITESPACE_IF);
  });

});


// -----------------------------------------------------------------------------
// @id::real-world javascriptin scenarios
// -----------------------------------------------------------------------------
describe('real-world scenarios', () => {
  test('build configuration switching', () => {
    const input = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://development.api.com',
  // ###[IF]env=production;rm=1L;
  debug: true,
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
  /*verbose: true */
};`;
    const expectedProd = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://production.api.com',
  // ###[IF]env=production;rm=1L;
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
};`;

    const expectedDev = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://development.api.com',
  // ###[IF]env=production;rm=1L;
  debug: true,
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
  verbose: true
};`;

    expect(commentDirective(
      input,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(expectedProd);

    expect(commentDirective(
      input,
      { env: 'development' },
      { keepDirective: true },
    )).toEqual(expectedDev);
  });

  test('complex-ish template', () => {
    const input = `
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
    const expected = `
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

    const expected_0 = `
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


    expect(commentDirective(
      input,
      { is_fg: 1 },
      { keepDirective: true },
    )).toEqual(expected);

    expect(commentDirective(
      input,
      { is_fg: 0 },
      { keepDirective: true },
    )).toEqual(expected_0);
  });

  test('feature flag management', () => {
    const input = `
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
    const expectedNewUI = `
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
    const expectedOldUI = `
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

    expect(commentDirective(
      input,
      { feature_new_ui: 1 },
      {
        single: [/\{\/\*s*/, /s*\*\/\}/],
        multi: [/\{\/\*/, /\*\/\}/],
        keepSpace: true,
        keepDirective: true,
      },
    )).toEqual(expectedNewUI);
    expect(commentDirective(
      input,
      { feature_new_ui: 0 },
      {
        single: [/\{\/\*s*/, /s*\*\/\}/],
        multi: [/\{\/\*/, /\*\/\}/],
        keepSpace: true,
        keepDirective: true,
      },
    )).toEqual(expectedOldUI);
  });

});


// -----------------------------------------------------------------------------
// @id::Botxamples
// -----------------------------------------------------------------------------
describe('Bot Examples', () => {
  test('Basic Usage', () => {
    const template = `
    // ###[IF]env=production;sed=/localhost:3000/api.example.com/;
    const apiUrl = 'http://localhost:3000/api';`;
    const output = `
    // ###[IF]env=production;sed=/localhost:3000/api.example.com/;
    const apiUrl = 'http://api.example.com/api';`;
    expect(commentDirective(
      template,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(output);

  });

  // Supported Actions: Text Replacement

  test('Text Replacement - Basic', () => {
    const template = `
    // ###[IF]debug=true;sed=/console.log/logger.debug/;
    console.log('Debug message');
    console.error('Error message');
    `;
    const output = `
    // ###[IF]debug=true;sed=/console.log/logger.debug/;
    logger.debug('Debug message');
    console.error('Error message');
    `;
    expect(commentDirective(
      template,
      { debug: true },
      { keepDirective: true },
    )).toEqual(output);
  });

  test('Text Replacement - Global replacement with flags', () => {
    const template = `
    // ###[IF]prod=1;sed=/dev-/prod-/g;
    const devServer = 'dev-api.com';
    const devDatabase = 'dev-db.com';
    const devCache = 'dev-redis.com';
    `;
    const output = `
    // ###[IF]prod=1;sed=/dev-/prod-/g;
    const devServer = 'prod-api.com';
    const devDatabase = 'prod-db.com';
    const devCache = 'prod-redis.com';
    `;
    expect(commentDirective(
      template,
      { prod: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  test('Text Replacement - Case-insensitive replacement', () => {
    const template = `
    // ###[IF]normalize=1;sed=/ERROR/error/i;
    System ERROR occurred
    Another Error detected
    `;
    const output = `
    // ###[IF]normalize=1;sed=/ERROR/error/i;
    System error occurred
    Another Error detected
    `;
    expect(commentDirective(
      template,
      { normalize: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  test('Text Replacement - Multi-line replacement (2L)', () => {
    const template = `
    // ###[IF]refactor=1;sed=/oldFunction/newFunction/2L;
    const result1 = oldFunction(data);
    const result2 = oldFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
    const output = `
    // ###[IF]refactor=1;sed=/oldFunction/newFunction/2L;
    const result1 = newFunction(data);
    const result2 = newFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
    expect(commentDirective(
      template,
      { refactor: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  // Supported Actions: Remove Lines

  test('Remove Lines - rm=3L', () => {
    const template = `
    console.log('Always runs');
    // ###[IF]removeLogs=1;rm=3L;
    console.log('Debug line 1');
    console.log('Debug line 2');
    console.log('Debug line 3');
    console.log('This will remain');
    `;
    const output = `
    console.log('Always runs');
    // ###[IF]removeLogs=1;rm=3L;
    console.log('This will remain');
    `;
    expect(commentDirective(
      template,
      { removeLogs: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  // Supported Actions: Remove Comments

  test('Remove Comments - rm=comment', () => {
    const template = `
    // ###[IF]minify=1;rm=comment;
    /* This is a detailed explanation
       of what this function does
       and why it exists */
    function importantFunction() {
      return 'result';
    }
    `;
    const output = `
    // ###[IF]minify=1;rm=comment;
    function importantFunction() {
      return 'result';
    }
    `;
    expect(commentDirective(
      template,
      { minify: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  // Supported Actions: Uncomment Code

  test('Uncomment Code - un=comment', () => {
    const template = `
    // ###[IF]enableFeature=1;un=comment;
    /*function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }*/`;
    const output = `
    // ###[IF]enableFeature=1;un=comment;
    function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }`;
    expect(commentDirective(
      template,
      { enableFeature: 1 },
      { keepDirective: true },
    )).toEqual(output);
  });

  // Language Support

  test('Language Support - C-like (Rust example)', () => {
    const rustCode = `
    fn main() {
        // ###[IF]feature_x=1;sed=/println!(/log::info!(/;
        println!("Debug message");
    }
    `;
    const expected = `
    fn main() {
        // ###[IF]feature_x=1;sed=/println!(/log::info!(/;
        log::info!("Debug message");
    }
    `;
    expect(commentDirective(
      rustCode,
      { feature_x: 1 },
      { ...cLike, keepDirective: true },
    )).toEqual(expected);
  });

  test('Language Support - Python example', () => {
    const pythonCode = `
    # ###[IF]debug=1;sed=/print(/logging.info(/g;
    print('Hello world')
    def calculate():
        print('Calculating...')
    `;
    const expected = `
    # ###[IF]debug=1;sed=/print(/logging.info(/g;
    logging.info('Hello world')
    def calculate():
        logging.info('Calculating...')
    `;
    expect(commentDirective(
      pythonCode,
      { debug: 1 },
      { ...python, keepDirective: true },
    )).toEqual(expected);
  });

  test('Language Support - HTML example', () => {
    const htmlTemplate = `
    <!-- ###[IF]prod=1;sed=/localhost/example.com/g; -->
    <script src="http://localhost:3000/api.js"></script>
    <link href="http://localhost:3000/styles.css" rel="stylesheet">
    `;
    const expected = `
    <!-- ###[IF]prod=1;sed=/localhost/example.com/g; -->
    <script src="http://example.com:3000/api.js"></script>
    <link href="http://example.com:3000/styles.css" rel="stylesheet">
    `;
    expect(commentDirective(
      htmlTemplate,
      { prod: 1 },
      { ...html, keepDirective: true },
    )).toEqual(expected);
  });

  test('Language Support - CSS example', () => {
    const cssCode = `
    body {
      /* ###[IF]theme=dark;sed=/white/black/; */
      background-color: white;
      color: black;
    }
    `;
    const expected = `
    body {
      /* ###[IF]theme=dark;sed=/white/black/; */
      background-color: black;
      color: black;
    }
    `;
    expect(commentDirective(
      cssCode,
      { theme: 'dark' },
      { ...css, keepDirective: true },
    )).toEqual(expected);
  });

  test('Language Support - Bash/Shell example', () => {
    const shellScript = `
    #!/bin/bash
    # ###[IF]env=prod;sed=/localhost/production.server.com/;
    curl http://localhost:8080/health
    echo "Server status checked"
    `;
    const expected = `
    #!/bin/bash
    # ###[IF]env=prod;sed=/localhost/production.server.com/;
    curl http://production.server.com:8080/health
    echo "Server status checked"
    `;
    expect(commentDirective(
      shellScript,
      { env: 'prod' },
      { ...bash, keepDirective: true },
    )).toEqual(expected);
  });

  // Advanced Examples

  test('Advanced - Build Configuration Management (development)', () => {
    const buildConfig = `
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
    const expected = `
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

    expect(commentDirective(
      buildConfig,
      { env: 'development' },
      { keepDirective: true },
    )).toEqual(expected);
  });

  test('Advanced - Build Configuration Management (production)', () => {
    const buildConfig = `
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
    const expected = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://production.api.com',
      // ###[IF]env=production;rm=2L;
      // ###[IF]env=production;un=comment;rm=comment;
      compressionEnabled: true,
      // ###[IF]env=development;un=comment;rm=comment;
    };
    `;

    expect(commentDirective(
      buildConfig,
      { env: 'production' },
      { keepDirective: true },
    )).toEqual(expected);
  });

  test('Advanced - Feature Flag Implementation', () => {
    const featureCode = `
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
    const withCacheExpected = `
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
    expect(commentDirective(
      featureCode,
      { cache_enabled: 1 },
      { keepDirective: true },
    )).toEqual(withCacheExpected);

    const fullFeaturesExpected = `
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
      featureCode,
      { cache_enabled: 1, analytics: 1 },
      { keepDirective: true },
    )).toEqual(fullFeaturesExpected);
  });


  // Custom Comment Formats
  test('Custom Comment Formats - SQL example', () => {
    const sqlScript = `
    -- ###[IF]env=prod;sed=/test_db/prod_db/;
    USE test_db;
    SELECT * FROM users;
    `;
    const expected = `
    -- ###[IF]env=prod;sed=/test_db/prod_db/;
    USE prod_db;
    SELECT * FROM users;
    `;
    expect(commentDirective(
      sqlScript,
      { env: 'prod' },
      { ...sql, keepDirective: true },
    )).toEqual(expected);
  });

  // Error Handling
  test('Error Handling - Unknown actions are ignored', () => {
    const unknownAction = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
    const expected = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
    expect(commentDirective(
      unknownAction,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(expected);
  });

  test('Error Handling - Invalid sed patterns are ignored', () => {
    const invalidSed = `
    // ###[IF]test=1;sed=invalid_pattern;
    console.log('This line remains unchanged');
    `;
    const expected = `
    // ###[IF]test=1;sed=invalid_pattern;
    console.log('This line remains unchanged');
    `;
    expect(commentDirective(
      invalidSed,
      { test: 1 },
      { keepDirective: true },
    )).toEqual(expected);
  });
});
