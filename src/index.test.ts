/**                                                                       @about
@file: index.test.ts
@desc: main tests with default options (no keepDirective)
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
      `, { test: 0 }, {identifier: '@@@[YOLO]'}))
      .toEqual(`
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
      /* dont remove me */  



      /* dont remove me */





      /* dont remove me */ 



--------------

  let nested = "comments";
  /* let test = "match";  */

--------------
`;

    expect(commentDirective(UNHOLY_NESTING, { test: 0 }, {
      nested: true,
      multi: [/\s*\/\*\s*/, /\s*\*\/\s*/],
      keepPadIn: false,
      keepPadEnd: false,
    }))
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
      `, { test: 0}, {keepEmpty: true }))
      .toEqual(`


      /* throw                                                                */
      `);

    expect(commentDirective(`
      // ###[IF]test=0;rm=comment;
      /* throw                                                                */
      /* throw                                                                */
      `, { test: 0}, {keepEmpty: true, keepPadStart: false }))
      .toEqual(`

      /* throw                                                                */
      `);


    expect(commentDirective(`
      // ###[IF]test=0;rm=comment;
      // throw
      /* throw                                                                */
      `, { test: 0}, {keepEmpty: true }))
      .toEqual(`


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

      `, { test: 0}, {keepEmpty: false }))
      .toEqual(`
------------------

------------------
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

      `, { test: 0}, {keepEmpty: true }))
      .toEqual(`
------------------

------------------















------------------

------------------

      `);


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

  const SED_SINGLE_EXPECT_IF_FALSE = `
    export default ptag;`;

  const SED_SINGLE_EXPECT_IF_TRUE = `
    export default cool;`;

  test('single comment replace - no match', () => {
    expect(commentDirective(SED_SINGLE_INPUT, { is_any: 0 }))
      .toEqual(SED_SINGLE_EXPECT_IF_FALSE);
  });

  test('single comment replace - match', () => {
    expect(commentDirective(SED_SINGLE_INPUT, { is_any: 1 }))
      .toEqual(SED_SINGLE_EXPECT_IF_TRUE);
  });

  // Multiple stacked directives
  const SED_STACKED_INPUT = `
      // ###[IF]is_txt=0;sed=/txt.ptag/{#}tag.ptag{+}/;
      // ###[IF]is_txt=1;sed=/ptag/ptag{+}/;
      _css: cn().CSS.txt.ptag,`;

  const SED_STACKED_EXPECT_IF_TXT_FALSE = `
      _css: cn().CSS.{#}tag.ptag{+},`;

  const SED_STACKED_EXPECT_IF_TXT_TRUE = `
      _css: cn().CSS.txt.ptag{+},`;

  test('multiple stacked directives - first condition', () => {
    expect(commentDirective(SED_STACKED_INPUT, { is_txt: 0 }))
      .toEqual(SED_STACKED_EXPECT_IF_TXT_FALSE);
  });

  test('multiple stacked directives - second condition', () => {
    expect(commentDirective(SED_STACKED_INPUT, { is_txt: 1 }))
      .toEqual(SED_STACKED_EXPECT_IF_TXT_TRUE);
  });

  // Global sed replacement
  const SED_GLOBAL_INPUT = `
    // ###[IF]debug=1;sed=/console/logger/g;
    console.log('test');
    console.warn('warning');
    function test() {
      console.error('error');
    }`;

  const SED_GLOBAL_EXPECTED = `
    logger.log('test');
    logger.warn('warning');
    function test() {
      logger.error('error');
    }`;

  test('global sed replacement', () => {
    expect(commentDirective(SED_GLOBAL_INPUT, { debug: 1 }))
      .toEqual(SED_GLOBAL_EXPECTED);
  });

  test('global sed replacement N lines', () => {
    const SED_GLOBAL_N_LINES_INPUT = `
    // ###[IF]deli=1;sed=###/###+###g1L;
    let maths = 1 / 2 / 3;
    let maths = 1 / 2 / 4;
    // ###[IF]deli=1;sed=###/###+###g2L;
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`;
    const SED_GLOBAL_N_LINES_EXPECTED = `
    let maths = 1 + 2 + 3;
    let maths = 1 / 2 / 4;
    let maths = 1 + 2 + 5;
    let maths = 1 + 2 + 6;
    let maths = 1 / 2 / 7;
    let maths = 1 / 2 / 8;
    let maths = 1 / 2 / 9;`;

    expect(commentDirective(SED_GLOBAL_N_LINES_INPUT, { deli: 1 }, { delimiter: '###' }))
      .toEqual(SED_GLOBAL_N_LINES_EXPECTED);
  });

  // Multiline sed replacement
  const SED_MULTILINE_INPUT = `
    // ###[IF]mode=dev;sed=/old/new/2L;
    const old = 'value1';
    const old = 'value2';
    const old = 'value3';`;

  const SED_MULTILINE_EXPECTED = `
    const new = 'value1';
    const new = 'value2';
    const old = 'value3';`;

  test('multiline sed replacement', () => {
    expect(commentDirective(SED_MULTILINE_INPUT, { mode: 'dev' }))
      .toEqual(SED_MULTILINE_EXPECTED);
  });

  // Nested sed
  const NESTED_SED_INPUT = `
    // ###[IF]un=1;un=comment;
    // ###[IF]debug=1;sed=/WORK/YOLO/;
    // ###[IF]other=1;sed=/YOLO/POLO/;
    // ###[IF]other=1;sed=/POLO/COLO/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_INPUT_ALT = `
    // ###[IF]other=1;sed=/WORK/POLO/;
    // ###[IF]other=1;sed=/POLO/YOLO/;
    // ###[IF]debug=1;sed=/YOLO/COLO/;
    // ###[IF]un=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_ELSE = `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG = `
    // console.log("THIS SHOULD YOLO");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_OTHER = `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG_OTHER = `
    // console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  const NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN = `
    console.log("THIS SHOULD COLO");
    console.log("pretty please");`;

  test('multiline sed - nested', () => {
    expect(commentDirective(NESTED_SED_INPUT, { debug: 0 }))
      .toEqual(NESTED_SED_EXPECT_ELSE);

    expect(commentDirective(NESTED_SED_INPUT, { debug: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_DEBUG);

    expect(commentDirective(NESTED_SED_INPUT, { other: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_OTHER);

    expect(commentDirective(NESTED_SED_INPUT, { debug: 1, other: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER);

    expect(commentDirective(NESTED_SED_INPUT, {
      debug: 1, other: 1, un: 1,
    })).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN);
  });

  test('multiline sed - nested alt', () => {
    expect(commentDirective(NESTED_SED_INPUT_ALT, { debug: 0 }))
      .toEqual(NESTED_SED_EXPECT_ELSE);

    expect(commentDirective(NESTED_SED_INPUT_ALT, { debug: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_OTHER);

    expect(commentDirective(NESTED_SED_INPUT_ALT, { other: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_DEBUG);

    expect(commentDirective(NESTED_SED_INPUT_ALT, { debug: 1, other: 1 }))
      .toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER);

    expect(commentDirective(NESTED_SED_INPUT_ALT, {
      debug: 1, other: 1, un: 1,
    })).toEqual(NESTED_SED_EXPECT_IF_DEBUG_OTHER_UN);
  });

  // Sed with regex flags
  const SED_FLAGS_INPUT = `
    // ###[IF]case=1;sed=/Hello/hi/i;
    Hello World`;

  const SED_FLAGS_EXPECTED = `
    hi World`;

  test('sed with regex flags', () => {
    expect(commentDirective(SED_FLAGS_INPUT, { case: 1 }))
      .toEqual(SED_FLAGS_EXPECTED);
  });

  // Sed with regex flags
  const SED_DELIMITER_INPUT_A = `
    // ###[IF]case=1;sed=$localhost:3000/api$api.example.com/other$;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_INPUT_B = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_INPUT_C = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%2L;
    const apiUrl = 'http://localhost:3000/api';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_INPUT_D = `
    // ###[IF]case=1;sed=%%%localhost:3000/api%%%api.example.com/other%%%i2L;
    const apiUrl = 'http://localHost:3000/api';
    const apiUrl2 = 'http://locaLhost:3000/api';`;

  const SED_DELIMITER_EXPECTED = `
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://localhost:3000/api';`;
  const SED_DELIMITER_EXPECTED_C = `
    const apiUrl = 'http://api.example.com/other';
    const apiUrl2 = 'http://api.example.com/other';`;

  test('sed with diffrent delimiter', () => {
    expect(commentDirective(SED_DELIMITER_INPUT_A, { case: 1 }, { delimiter: '$' }))
      .toEqual(SED_DELIMITER_EXPECTED);

    expect(commentDirective(SED_DELIMITER_INPUT_B, { case: 1 }, { delimiter: '%%%' }))
      .toEqual(SED_DELIMITER_EXPECTED);

    expect(commentDirective(SED_DELIMITER_INPUT_C, { case: 1 }, { delimiter: '%%%' }))
      .toEqual(SED_DELIMITER_EXPECTED_C);

    expect(commentDirective(SED_DELIMITER_INPUT_D, { case: 1 }, { delimiter: '%%%' }))
      .toEqual(SED_DELIMITER_EXPECTED_C);
  });
});


// -----------------------------------------------------------------------------
// @id::seq
// -----------------------------------------------------------------------------
describe('seq', () => {
  const SEQ_INPUT = `
// ###[IF]seq=1;prepend=// ;shift=// ;
console.log('single line');

// ###[IF]seq=1;append= /* cool *//;pop= /* cool *//;
console.log('single line');

// ###[IF]seq=1;prepend=// ;shift=// ;
// ###[IF]seq=1;append= /* cool *//;pop= /* cool *//;
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

  const SEQ_OUTPUT = `
// console.log('single line');

console.log('single line'); /* cool */

// console.log('stacked'); /* cool */

// const aContrivedExample = (aval = true) => {
//   const aurl = 'https://my.api.com:3000'
//   return {aurl, aval};
// };
// //#STOP


const aContrivedExample = (aval = true) => { /* cool */ 
  const aurl = 'https://my.api.com:3000' /* cool */ 
  return {aurl, aval}; /* cool */ 
}; /* cool */ 
//#STOP /* cool */ 


###const aContrivedExample = (aval = true) => {
###  const aurl = 'https://my.api.com:3000'
###  return {aurl, aval};
###};


const aContrivedExample = (aval = true) => {###
  const aurl = 'https://my.api.com:3000'###
  return {aurl, aval};###
};###
`;

  test('all seq(s) should work', () => {
    const output = commentDirective(SEQ_INPUT, { seq: 1 });
    expect(output).toEqual(SEQ_OUTPUT);
  });


  test('empty seq option should work with default delimiter', () => {
    // the last '/' it removed here since it's the default 'delimiter'
    const SEQ_EMPTY_OPT_EQ_INPUT = `
// ###[IF]seq=1;append= /* cool *//;pop= /* cool *//;
console.log('test');
`;
    const SEQ_EMPTY_OPT_EQ_EXPECTED = `
console.log('test'); /* cool */
`;

    expect(commentDirective(
      SEQ_EMPTY_OPT_EQ_INPUT,
      { seq: 1 },
    )).toEqual(SEQ_EMPTY_OPT_EQ_EXPECTED);
  });

  test('empty seq option should work with non-default delimiter', () => {
    // the last '/' it removed here since it's the default 'delimiter'
    const SEQ_EMPTY_OPT_EQ_INPUT = `
// ###[IF]seq=1;append= /* cool */#;pop= /* cool */#;
console.log('test');
`;
    const SEQ_EMPTY_OPT_EQ_EXPECTED = `
console.log('test'); /* cool */
`;

    expect(commentDirective(
      SEQ_EMPTY_OPT_EQ_INPUT,
      { seq: 1 },
      { delimiter: '#' },
    )).toEqual(SEQ_EMPTY_OPT_EQ_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// @id::rm lines
// -----------------------------------------------------------------------------
describe('remove lines', () => {

  test('dont rm unless next line', () => {
    const RM_DONT_UNLESS_NEXT_INPUT = `
--------
// ###[IF]env=1;un=comment;rm=comment;
let nested = "comments";
// ###[IF]env=100;un=comment;
// let dont = "work";
/*


*/
--------
    `;
    const RM_DONT_UNLESS_NEXT_EXPECTED_1 = `
--------
let nested = "comments";
// let dont = "work";
/*


*/
--------
    `;
    const RM_DONT_UNLESS_NEXT_EXPECTED_100 = `
--------
let nested = "comments";
let dont = "work";
/*


*/
--------
    `;
    expect(commentDirective(RM_DONT_UNLESS_NEXT_INPUT, { env: 1 }))
      .toEqual(RM_DONT_UNLESS_NEXT_EXPECTED_1);
    expect(commentDirective(RM_DONT_UNLESS_NEXT_INPUT, { env: 0 }))
      .toEqual(RM_DONT_UNLESS_NEXT_EXPECTED_1);
    expect(commentDirective(RM_DONT_UNLESS_NEXT_INPUT, { env: 100 }))
      .toEqual(RM_DONT_UNLESS_NEXT_EXPECTED_100);
  });

  test('dont rm commented out directives', () => {
    const RM_DONT_COMMENTED_OUT_DIRECTIVES_INPUT = `
// // ###[IF]test=0;rm=comment;
// let maths = 1 / 2 / 5;
//     // ###[IF]test=0;rm=comment;
//     let maths = 1 / 2 / 5;
    `;
    expect(commentDirective(RM_DONT_COMMENTED_OUT_DIRECTIVES_INPUT, { test: 0 }))
      .toEqual(RM_DONT_COMMENTED_OUT_DIRECTIVES_INPUT);
  });

  test('rm single comments at end of line - loose', () => {
    const RM_SINGLE_END_OF_LINE_INPUT = `
console.log('willy'); // ###[IF]test=0;rm=comment;
console.log('nilly'); // remove this comment
console.log('i stay'); // ###[IF]test=0;rm=line;
console.log('i dont'); // remove this line

console.log('i stay'); // ###[IF]test=0;rm=line;
console.log('i dont'); // remove this line
`;
    const RM_SINGLE_END_OF_LINE_OUT = `
console.log('willy');
console.log('nilly');
console.log('i stay');

console.log('i stay');`;
    expect(commentDirective(RM_SINGLE_END_OF_LINE_INPUT, { test: 0 }, { loose: true }).trim())
      .toEqual(RM_SINGLE_END_OF_LINE_OUT.trim());

    expect(commentDirective(
      RM_SINGLE_END_OF_LINE_INPUT,
      { test: 0 },
      { loose: false },
    )).toEqual(RM_SINGLE_END_OF_LINE_INPUT);

  });

  test('rm stacked - loose', () => {
    const RM_STACKED_INPUT = `
console.log('1111'); // ###[IF]test=1;rm=line;rm=comment;
console.log('2222'); // ###[IF]test=1;rm=line;rm=comment;
console.log('3333'); // remove this line or comment
console.log('4444'); // keep this line`;
    const RM_STACKED_OUT_0 = `
console.log('1111');
console.log('2222');
console.log('3333');
console.log('4444'); // keep this line`;
    const RM_STACKED_OUT_1 = `
console.log('1111');
console.log('4444'); // keep this line`;


    const RM_STACKCASE_INPUT = `
// ###[IF]test=0;sed=/0/1/;sed=/0/2/;
// ###[IF]test=0;sed=/0/1/;sed=/0/2/;
// ###[IF]test=0;sed=/0/1/;sed=/0/2/;
console.log('0000'); // ###[IF]test=0;sed=/1/0/;sed=/1/2/;
console.log('1111'); // ###[IF]test=1;rm=line;rm=comment;
console.log('2222'); // ###[IF]test=3;rm=line;
console.log('3333'); // ###[IF]test=1;rm=line;rm=comment;
console.log('4444'); // remove this line
console.log('5555'); // ###[IF]test=1;rm=comment;rm=comment;
console.log('6666'); // remove this comment


console.log('0000'); // ###[IF]test=1;rm=line;rm=comment;
console.log('1111'); // ###[IF]test=1;rm=line;rm=comment;
console.log('2222'); // ###[IF]test=1;rm=line;rm=comment;
console.log('3333'); // remove this line
console.log('4444');`;

    const RM_STACKCASE_OUT_0 = `
console.log('1110');
console.log('0111');
console.log('2222');
console.log('3333');
console.log('4444');
console.log('5555');
console.log('6666');


console.log('0000');
console.log('1111');
console.log('2222');
console.log('3333');
console.log('4444');`;

    const RM_STACKCASE_OUT_1 = `
console.log('2220');
console.log('2111');
console.log('3333');
console.log('5555');
console.log('6666');


console.log('0000');
console.log('4444');`;


    const RM_STACKCASE_OUT_2 = `
console.log('2220');
console.log('2111');
console.log('2222');
console.log('3333');
console.log('4444');
console.log('5555');
console.log('6666');


console.log('0000');
console.log('1111');
console.log('2222');
console.log('3333');
console.log('4444');`;


    const RM_STACKCASE_OUT_3 = `
console.log('2220');
console.log('2111');
console.log('2222');
console.log('4444');
console.log('5555');
console.log('6666');


console.log('0000');
console.log('1111');
console.log('2222');
console.log('3333');
console.log('4444');`;


    expect(commentDirective(
      RM_STACKED_INPUT,
      { test: 0 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKED_OUT_0.trim());

    expect(commentDirective(
      RM_STACKED_INPUT,
      { test: 1 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKED_OUT_1.trim());


    expect(commentDirective(
      RM_STACKCASE_INPUT,
      { test: 0 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKCASE_OUT_0.trim());
    expect(commentDirective(
      RM_STACKCASE_INPUT,
      { test: 1 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKCASE_OUT_1.trim());
    expect(commentDirective(
      RM_STACKCASE_INPUT,
      { test: 2 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKCASE_OUT_2.trim());
    expect(commentDirective(
      RM_STACKCASE_INPUT,
      { test: 3 },
      { keepDirective: false, loose: true },
    ).trim()).toEqual(RM_STACKCASE_OUT_3.trim());
  });


  const RL_INPUT = `
    line1
    // ###[IF]debug=0;rm=2L;
    line2
    line3
    line4`;

  const RL_EXPECT_IF_FALSE = `
    line1
    line4`;

  const RL_EXPECT_IF_TRUE = `
    line1
    line2
    line3
    line4`;
  test('remove specific number of lines', () => {
    expect(commentDirective(RL_INPUT, { debug: 0 }))
      .toEqual(RL_EXPECT_IF_FALSE);
  });

  test('remove lines - no match', () => {
    expect(commentDirective(RL_INPUT, { debug: 1 }))
      .toEqual(RL_EXPECT_IF_TRUE);
  });
});

// -----------------------------------------------------------------------------
// @id::rm comments
// -----------------------------------------------------------------------------
describe('remove comments', () => {
  // No-op remove-comment directives
  const RC_NOPE_INPUT = `
    // ###[IF]other=1;rm=comment;
    console.log("pretty please");`;

  const RC_NOPE_EXPECTED = `
    console.log("pretty please");`;

  const RC_NOPE_COND_INPUT = `
    // ###[IF]other=1;rm=comment;rm=comment;
    console.log("pretty please");`;

  test('should not remove if no comment', () => {
    expect(commentDirective(RC_NOPE_INPUT, { other: 1 }))
      .toEqual(RC_NOPE_EXPECTED);
    expect(commentDirective(RC_NOPE_INPUT, { other: 0 }))
      .toEqual(RC_NOPE_EXPECTED);
  });

  test('should not remove if no comment cond', () => {
    expect(commentDirective(RC_NOPE_COND_INPUT, { other: 1 }))
      .toEqual(RC_NOPE_EXPECTED);
    expect(commentDirective(RC_NOPE_COND_INPUT, { other: 0 }))
      .toEqual(RC_NOPE_EXPECTED);
  });

  // Remove single-line comment
  const RC_LINE_INPUT = `
    // ###[IF]debug=1;un=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_EXPECT_IF_TRUE = `
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_EXPECT_IF_FALSE = `
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  test('remove single-line comment', () => {
    expect(commentDirective(RC_LINE_INPUT, { debug: 1 }))
      .toEqual(RC_LINE_EXPECT_IF_TRUE);
    expect(commentDirective(RC_LINE_INPUT, { debug: 0 }))
      .toEqual(RC_LINE_EXPECT_IF_FALSE);
  });

  // Remove single-line comment with conditional sed
  const RC_LINE_COND_INPUT = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_COND_EXPECT_IF_TRUE = `
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_COND_EXPECT_ELSE = `
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  test('remove single-line comment cond', () => {
    expect(commentDirective(RC_LINE_COND_INPUT, { debug: 1 }))
      .toEqual(RC_LINE_COND_EXPECT_IF_TRUE);
    expect(commentDirective(RC_LINE_COND_INPUT, { debug: 0 }))
      .toEqual(RC_LINE_COND_EXPECT_ELSE);
  });

  // Remove/mod single-line comment cond nested
  const RC_LINE_NEST_INPUT = `
    // ###[IF]other=1;rm=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_INPUT_ALT = `
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // ###[IF]other=1;rm=comment;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_IF_TRUE = `
    console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_ELSE = `
    // console.log("THIS SHOULD WORK PLEASE");
    console.log("pretty please");`;

  const RC_LINE_NEST_EXPECT_ELSE_OTHER = `
    console.log("pretty please");`;

  test('remove/mod single-line comment cond nested', () => {
    expect(commentDirective(RC_LINE_NEST_INPUT, { debug: 1 }))
      .toEqual(RC_LINE_NEST_EXPECT_IF_TRUE);
    expect(commentDirective(RC_LINE_NEST_INPUT, { debug: 0 }))
      .toEqual(RC_LINE_NEST_EXPECT_ELSE);
    expect(commentDirective(RC_LINE_NEST_INPUT_ALT, { debug: 1 }))
      .toEqual(RC_LINE_NEST_EXPECT_IF_TRUE);
    expect(commentDirective(RC_LINE_NEST_INPUT_ALT, { debug: 0 }))
      .toEqual(RC_LINE_NEST_EXPECT_ELSE);

    expect(commentDirective(RC_LINE_NEST_INPUT, { debug: 0, other: 0 }))
      .toEqual(RC_LINE_NEST_EXPECT_ELSE);
    expect(commentDirective(RC_LINE_NEST_INPUT, { debug: 1, other: 1 }))
      .toEqual(RC_LINE_NEST_EXPECT_ELSE_OTHER);
  });

  test('remove/mod single-line comment cond nested - position', () => {
    const moveDirective = `// ###[IF]other=5;un=comment;`;
    const template = `
    ${moveDirective}
    // ###[IF]other=4;rm=comment;
    // ###[IF]other=3;un=comment;
    // ###[IF]other=2;rm=comment;
    // ###[IF]other=1;un=comment;
    // ###[IF]debug=1;un=comment;sed=/WORK/WORK PLEASE/;
    // console.log("THIS SHOULD WORK");
    console.log("pretty please");`;

    const variations: string[] = [];
    for (let i = 0; i < 5; i++) {
      if (i === 0) {
        variations.push(template);
      } else {
        const lines = template.split('\n');
        const replacedLine = lines[i];
        if (!replacedLine) { continue; }
        variations.push(template
          .replace(replacedLine, '&&&')
          .replace(moveDirective, replacedLine)
          .replace('&&&', moveDirective));
      }
    }

    for (const variant of variations) {
      expect(commentDirective(variant, { debug: 1, other: 5 }))
        .toEqual(RC_LINE_EXPECT_IF_TRUE);
    }
  });

  // Remove/uncomment single-line inline comments
  const RC_INLINE_MULTI_INPUT = `
    // ###[IF]debug=1;un=comment;
    // ###[IF]debug=2;rm=comment;
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_0 = `
    const arr = [1, 2, /* 3, 4,*/ 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_1 = `
    const arr = [1, 2, 3, 4, 5, 6];
    console.log("pretty please");`;

  const RC_INLINE_EXPECT_IF_2 = `
    const arr = [1, 2, 5, 6];
    console.log("pretty please");`;

  test('remove/uncomment single-line inline', () => {
    expect(commentDirective(RC_INLINE_MULTI_INPUT,
      { debug: 0 },
      { keepPadStart: false }))
      .toEqual(RC_INLINE_EXPECT_IF_0);
    expect(commentDirective(RC_INLINE_MULTI_INPUT,
      { debug: 1 },
      { keepPadStart: false }))
      .toEqual(RC_INLINE_EXPECT_IF_1);
    expect(commentDirective(RC_INLINE_MULTI_INPUT,
      { debug: 2 },
      { keepPadStart: false }))
      .toEqual(RC_INLINE_EXPECT_IF_2);
  });

  // Remove single-line multi comment
  const RC_SINGLE_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a comment */
    line2`;

  const RC_SINGLE_EXPECTED = `
    line1
    line2`;

  test('remove single-line multi comment', () => {
    expect(commentDirective(RC_SINGLE_INPUT, { clean: 1 }))
      .toEqual(RC_SINGLE_EXPECTED);
  });

  // Remove multiline comment
  const RC_MULTI_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    /* this is a
       multiline comment
       with multiple lines */
    line2`;

  const RC_MULTI_EXPECTED = `
    line1
    line2`;

  test('remove multiline comment', () => {
    expect(commentDirective(RC_MULTI_INPUT, { clean: 1 }))
      .toEqual(RC_MULTI_EXPECTED);
  });

  // Remove inline comment
  const RC_INLINE_INPUT = `
    line1
    // ###[IF]clean=1;rm=comment;
    const x = 5; /* inline comment */ const y = 10;
    line2`;

  const RC_INLINE_EXPECTED = `
    line1
    const x = 5; const y = 10;
    line2`;

  test('remove inline comment', () => {
    expect(commentDirective(RC_INLINE_INPUT, { clean: 1 }, {keepPadStart: false}))
      .toEqual(RC_INLINE_EXPECTED);
  });

  test('remove comment - no match', () => {
    const NO_MATCH_EXPECTED = `
    line1
    /* this is a comment */
    line2`;
    expect(commentDirective(RC_SINGLE_INPUT, { clean: 0 }))
      .toEqual(NO_MATCH_EXPECTED);
  });


  test('remove comment - no match', () => {
    const RM_COMMENT_KEEP_EMPTY_INPUT = `
    // ###[IF]deli=1;un=comment;
    /*
    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;

    let maths = 1 / 2 / 7;







    let maths = 1 / 2 / 8777;
    */
    let maths = 1 / 2 / 9;
    `;
    const RM_COMMENT_KEEP_EMPTY_EXPECTED = `

    let maths = 1 / 2 / 5;
    let maths = 1 / 2 / 6;

    let maths = 1 / 2 / 7;







    let maths = 1 / 2 / 8777;

    let maths = 1 / 2 / 9;
    `;
    expect(commentDirective(RM_COMMENT_KEEP_EMPTY_INPUT, { deli: 1 }))
      .toEqual(RM_COMMENT_KEEP_EMPTY_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// @id::uncomment
// -----------------------------------------------------------------------------
describe('uncomment', () => {
  const UNCOMMENT_SINGLE_INPUT = `
    line1
    // ###[IF]debug=1;un=comment;
    /*console.log('debug');*/
    line2`;

  const UNCOMMENT_SINGLE_EXPECT_IF_TRUE = `
    line1
    console.log('debug');
    line2`;

  const UNCOMMENT_SINGLE_EXPECT_IF_FALSE = `
    line1
    /*console.log('debug');*/
    line2`;

  test('uncomment single-line comment', () => {
    expect(commentDirective(UNCOMMENT_SINGLE_INPUT, { debug: 1 }))
      .toEqual(UNCOMMENT_SINGLE_EXPECT_IF_TRUE);
  });

  test('uncomment - no match', () => {
    expect(commentDirective(UNCOMMENT_SINGLE_INPUT, { debug: 0 }))
      .toEqual(UNCOMMENT_SINGLE_EXPECT_IF_FALSE);
  });

  const UNCOMMENT_MULTI_INPUT = `
    line1
    // ###[IF]debug=1;un=comment;
    /*
    console.log('debug1');
    console.log('debug2');
    */
    line2`;

  const UNCOMMENT_MULTI_EXPECT_IF_TRUE = `
    line1

    console.log('debug1');
    console.log('debug2');

    line2`;

  test('uncomment multiline comment', () => {
    expect(commentDirective(UNCOMMENT_MULTI_INPUT, { debug: 1 }))
      .toEqual(UNCOMMENT_MULTI_EXPECT_IF_TRUE);
  });
});

// -----------------------------------------------------------------------------
// @id::conditional
// -----------------------------------------------------------------------------
describe('conditional with else', () => {
  const COND_ELSE_INPUT = `
    // ###[IF]mode=prod;sed=/dev/production/;sed=/test/live/;
    const env = 'dev-test';`;

  const COND_ELSE_EXPECT_IF_TRUE = `
    const env = 'production-test';`;

  const COND_ELSE_EXPECT_IF_FALSE = `
    const env = 'dev-live';`;

  test('if-true condition with else clause', () => {
    expect(commentDirective(COND_ELSE_INPUT, { mode: 'prod' }))
      .toEqual(COND_ELSE_EXPECT_IF_TRUE);
  });

  test('if-false condition with else clause', () => {
    expect(commentDirective(COND_ELSE_INPUT, { mode: 'dev' }))
      .toEqual(COND_ELSE_EXPECT_IF_FALSE);
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
  const RUSTY_JS_SED_IF_EXPECTED = `
fn main() {
    log::info!("Hello, Rust!");
}`;
  const RUSTY_JS_SED_ELSE_EXPECTED = `
fn main() {
    println!("Hello, Rust!");
}`;

  test('sed replacement with Rust comments - IF', () => {
    expect(commentDirective(RUSTY_JS_SED_INPUT, { feature_x: 1 }, cLike))
      .toEqual(RUSTY_JS_SED_IF_EXPECTED);
  });

  test('sed replacement with Rust comments - ELSE', () => {
    expect(commentDirective(RUSTY_JS_SED_INPUT, { feature_x: 0 }, cLike))
      .toEqual(RUSTY_JS_SED_ELSE_EXPECTED);
  });

  const RUSTY_JS_RM_COMMENT_SINGLE_INPUT = `
// ###[IF]release=1;rm=comment;
// This is a single line comment
let x = 5;`;
  const RUSTY_JS_RM_COMMENT_SINGLE_IF_EXPECTED = `
let x = 5;`;

  test('remove Rust single-line comment - IF', () => {
    expect(commentDirective(RUSTY_JS_RM_COMMENT_SINGLE_INPUT, { release: 1 }, cLike))
      .toEqual(RUSTY_JS_RM_COMMENT_SINGLE_IF_EXPECTED);
  });

  const RUSTY_JS_RM_COMMENT_MULTI_INPUT = `
// ###[IF]release=1;rm=comment;
/*
  This is a
  multi-line comment
*/
let y = 10;`;
  const RUSTY_JS_RM_COMMENT_MULTI_IF_EXPECTED = `
let y = 10;`;

  test('remove Rust multi-line comment - IF', () => {
    expect(commentDirective(RUSTY_JS_RM_COMMENT_MULTI_INPUT, { release: 1 }, cLike))
      .toEqual(RUSTY_JS_RM_COMMENT_MULTI_IF_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// python
// -----------------------------------------------------------------------------
describe('python', () => {
  const PY_SED_INPUT = `
# ###[IF]debug=1;sed=/print/logger.info/;
print('hello world')`;
  const PY_SED_IF_EXPECTED = `
logger.info('hello world')`;
  const PY_SED_ELSE_EXPECTED = `
print('hello world')`;

  test('sed replacement with Python comments - IF', () => {
    expect(commentDirective(PY_SED_INPUT, { debug: 1 }, python))
      .toEqual(PY_SED_IF_EXPECTED);
  });

  test('sed replacement with Python comments - ELSE', () => {
    expect(commentDirective(PY_SED_INPUT, { debug: 0 }, python))
      .toEqual(PY_SED_ELSE_EXPECTED);
  });

  const PY_RM_COMMENT_MULTI_INPUT = `
line1
# ###[IF]clean=1;rm=comment;
"""
This is a multiline
Python docstring
"""
line2`;
  const PY_RM_COMMENT_MULTI_IF_EXPECTED = `
line1
line2`;

  test('remove Python docstring comments - IF', () => {
    expect(commentDirective(PY_RM_COMMENT_MULTI_INPUT, { clean: 1 }, python))
      .toEqual(PY_RM_COMMENT_MULTI_IF_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// html
// -----------------------------------------------------------------------------
describe('html', () => {
  const HTML_SED_INPUT = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;
  const HTML_SED_IF_EXPECTED = `
<script src="prod-server.js"></script>`;
  const HTML_SED_ELSE_EXPECTED = `
<script src="dev-server.js"></script>`;

  test('sed replacement with HTML comments - IF', () => {
    expect(commentDirective(HTML_SED_INPUT, { prod: 1 }, html))
      .toEqual(HTML_SED_IF_EXPECTED);
  });

  test('sed replacement with HTML comments - ELSE', () => {
    expect(commentDirective(HTML_SED_INPUT, { prod: 0 }, html))
      .toEqual(HTML_SED_ELSE_EXPECTED);
  });

  const HTML_RM_COMMENT_INPUT = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
<!-- This is an HTML comment -->
</div>`;
  const HTML_RM_COMMENT_IF_EXPECTED = `
<div>
</div>`;

  test('remove HTML comments - IF', () => {
    expect(commentDirective(HTML_RM_COMMENT_INPUT, { clean: 1 }, html))
      .toEqual(HTML_RM_COMMENT_IF_EXPECTED);
  });


  const HTML_COMMENT_MULTI_INPUT = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_UN_EXPECTED = `
<!-- start -->


<script src="dev-server.js"></script>


<!-- end -->
`;
  const HTML_COMMENT_MULTI_RM_EXPECTED = `
<!-- start -->
<!-- end -->
`;

  test('multi remove HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI_INPUT, { prod: 0 }, html))
      .toEqual(HTML_COMMENT_MULTI_RM_EXPECTED);
  });
  test('multi un-comment HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI_INPUT, { prod: 1 }, html))
      .toEqual(HTML_COMMENT_MULTI_UN_EXPECTED);
  });

});

// for when multi is nulled out - interal logic is diff but results should be same unless multi
describe('html - nulled', () => {
  const htmlNulled: CommentOptions = {
    single: [/\s*<!--/, /\s*-->/],
    multi: [null, null],
  };
  const HTML_SED_INPUT = `
<!-- ###[IF]prod=1;sed=/dev-server/prod-server/; -->
<script src="dev-server.js"></script>`;
  const HTML_SED_IF_EXPECTED = `
<script src="prod-server.js"></script>`;
  const HTML_SED_ELSE_EXPECTED = `
<script src="dev-server.js"></script>`;

  test('sed replacement with HTML comments - IF', () => {
    expect(commentDirective(HTML_SED_INPUT, { prod: 1 }, htmlNulled))
      .toEqual(HTML_SED_IF_EXPECTED);
  });

  test('sed replacement with HTML comments - ELSE', () => {
    expect(commentDirective(HTML_SED_INPUT, { prod: 0 }, htmlNulled))
      .toEqual(HTML_SED_ELSE_EXPECTED);
  });

  const HTML_RM_COMMENT_INPUT = `
<div>
<!-- ###[IF]clean=1;rm=comment; -->
<!-- This is an HTML comment -->
</div>`;
  const HTML_RM_COMMENT_IF_EXPECTED = `
<div>
</div>`;

  test('remove HTML comments - IF', () => {
    expect(commentDirective(HTML_RM_COMMENT_INPUT, { clean: 1 }, htmlNulled))
      .toEqual(HTML_RM_COMMENT_IF_EXPECTED);

  });

  // should not work - as there no multi
  const HTML_COMMENT_MULTI_INPUT = `
<!-- start -->
<!-- ###[IF]prod=1;un=comment;rm=comment; -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_UN_EXPECTED = `
<!-- start -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  const HTML_COMMENT_MULTI_RM_EXPECTED = `
<!-- start -->
<!--

<script src="dev-server.js"></script>

-->
<!-- end -->
`;
  test('multi remove HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI_INPUT, { prod: 0 }, htmlNulled))
      .toEqual(HTML_COMMENT_MULTI_RM_EXPECTED);
  });
  test('multi un-comment HTML comments', () => {
    expect(commentDirective(HTML_COMMENT_MULTI_INPUT, { prod: 1 }, htmlNulled))
      .toEqual(HTML_COMMENT_MULTI_UN_EXPECTED);
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
  const CSS_SED_IF_EXPECTED = `
body {
  color: white;
}`;
  const CSS_SED_ELSE_EXPECTED = `
body {
  color: black;
}`;

  test('sed replacement with CSS comments - IF', () => {
    expect(commentDirective(CSS_SED_INPUT, { theme: 'light' }, css))
      .toEqual(CSS_SED_IF_EXPECTED);
  });

  test('sed replacement with CSS comments - ELSE', () => {
    expect(commentDirective(CSS_SED_INPUT, { theme: 'other' }, css))
      .toEqual(CSS_SED_ELSE_EXPECTED);
  });

  const CSS_RM_COMMENT_INPUT = `
/* ###[IF]minify=1;rm=comment; */
/* This is a CSS comment */
.selector {
  property: value;
}`;
  const CSS_RM_COMMENT_IF_EXPECTED = `
.selector {
  property: value;
}`;

  test('remove CSS comment - IF', () => {
    expect(commentDirective(CSS_RM_COMMENT_INPUT, { minify: 1 }, css))
      .toEqual(CSS_RM_COMMENT_IF_EXPECTED);
  });
});

// -----------------------------------------------------------------------------
// bash/shell
// -----------------------------------------------------------------------------
describe('bash/shell', () => {
  const BASH_SED_INPUT = `
# ###[IF]env=prod;sed=/echo "dev/echo "production/;
echo "dev server started"`;
  const BASH_SED_IF_EXPECTED = `
echo "production server started"`;
  const BASH_SED_ELSE_EXPECTED = `
echo "dev server started"`;

  test('sed replacement with Bash comments - IF', () => {
    expect(commentDirective(BASH_SED_INPUT, { env: 'prod' }, bash))
      .toEqual(BASH_SED_IF_EXPECTED);
  });

  test('sed replacement with Bash comments - ELSE', () => {
    expect(commentDirective(BASH_SED_INPUT, { env: 'dev' }, bash))
      .toEqual(BASH_SED_ELSE_EXPECTED);
  });

  const BASH_RM_COMMENT_SINGLE_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
# This is a bash comment
export VAR="value"`;
  const BASH_RM_COMMENT_SINGLE_IF_EXPECTED = `
export VAR="value"`;

  test('remove Bash single-line comment - IF', () => {
    expect(commentDirective(BASH_RM_COMMENT_SINGLE_INPUT, { strip_comments: 1 }, bash))
      .toEqual(BASH_RM_COMMENT_SINGLE_IF_EXPECTED);
  });

  const BASH_RM_COMMENT_MULTI_INPUT = `
# ###[IF]strip_comments=1;rm=comment;
<<'EOF'
This is a
multi-line here-document
treated as a comment.
EOF
ls -l`;
  const BASH_RM_COMMENT_MULTI_IF_EXPECTED = `
ls -l`;

  test('remove Bash multi-line here-document comment - IF', () => {
    expect(commentDirective(BASH_RM_COMMENT_MULTI_INPUT, { strip_comments: 1 }, bash))
      .toEqual(BASH_RM_COMMENT_MULTI_IF_EXPECTED);
  });
});


// -----------------------------------------------------------------------------
// @id::edge cases
// -----------------------------------------------------------------------------
describe('edge cases', () => {
  test('no matching conditions', () => {
    const EDGE_NO_MATCH_INPUT = `
// ###[IF]nonexistent=1;sed=/old/new/;
some content`;
    const EDGE_NO_MATCH_EXPECTED = `
some content`;
    expect(commentDirective(EDGE_NO_MATCH_INPUT, { other: 1 }))
      .toEqual(EDGE_NO_MATCH_EXPECTED);
  });

  test('white space adjust', () => {
    const WHITESPACE_ADJUST_INPUT = `
// ###[IF]case=1;un=comment;
  /* some content */`;
    const WHITESPACE_ADJUST_INPUT_B = `
// ###[IF]case=1;un=comment;
   /*some content*/ `;
    const WHITESPACE_ADJUST_INPUT_C = `
// ###[IF]case=1;un=comment;
   /*some content
   */c`;
    const WHITESPACE_ADJUST_EXPECTED = `
   some content `;
    const WHITESPACE_ADJUST_C_EXPECTED = `
   some content
   c`;

    expect(commentDirective(WHITESPACE_ADJUST_INPUT, { case: 1 }))
      .toEqual(WHITESPACE_ADJUST_EXPECTED);
    expect(commentDirective(WHITESPACE_ADJUST_INPUT_B, { case: 1 }))
      .toEqual(WHITESPACE_ADJUST_EXPECTED);
    expect(commentDirective(WHITESPACE_ADJUST_INPUT_C, { case: 1 }))
      .toEqual(WHITESPACE_ADJUST_C_EXPECTED);
  });

  test('complex nested scenarios', () => {
    const COMPLEX_NESTED_SCENARIOS_INPUT = `
// ###[IF]feature=enabled;rm=comment;
// ###[IF]debug=1;un=comment;
/*
// ###[IF]debug=1;sed=/old/new/;
const old = 'value';
// ###[IF]debug=1;rm=2L;
*/
const result = 'final';`;
    const COMPLEX_NESTED_SCENARIOS_EXPECTED_NOOP = `
/*
const old = 'value';
*/
const result = 'final';`;
    const COMPLEX_NESTED_SCENARIOS_EXPECTED_FEATURE_ENABLED = `
const result = 'final';`;
    const COMPLEX_NESTED_SCENARIOS_EXPECTED_DEBUG_ENABLED = `

const new = 'value';`;
    expect(commentDirective(COMPLEX_NESTED_SCENARIOS_INPUT, { noop: 1 }))
      .toEqual(COMPLEX_NESTED_SCENARIOS_EXPECTED_NOOP);
    expect(commentDirective(COMPLEX_NESTED_SCENARIOS_INPUT, { feature: 'enabled' }))
      .toEqual(COMPLEX_NESTED_SCENARIOS_EXPECTED_FEATURE_ENABLED);
    expect(commentDirective(COMPLEX_NESTED_SCENARIOS_INPUT, { debug: 1 }))
      .toEqual(COMPLEX_NESTED_SCENARIOS_EXPECTED_DEBUG_ENABLED);
  });

  test('empty lines preserved', () => {
    const EMPTY_LINES_PRESERVED_INPUT = `

// ###[IF]test=1;sed=/old/new/;
old value

`;
    const EMPTY_LINES_PRESERVED_EXPECTED = `

new value

`;
    expect(commentDirective(EMPTY_LINES_PRESERVED_INPUT, { test: 1 }))
      .toEqual(EMPTY_LINES_PRESERVED_EXPECTED);
  });

  test('numeric vs string values', () => {
    const NUMERIC_STRING_VALUES_INPUT = `
// ###[IF]count=5;sed=/old/new/;
old value`;
    const NUMERIC_STRING_VALUES_EXPECTED = `
new value`;
    expect(commentDirective(NUMERIC_STRING_VALUES_INPUT, { count: 5 }))
      .toEqual(NUMERIC_STRING_VALUES_EXPECTED);
    expect(commentDirective(NUMERIC_STRING_VALUES_INPUT, { count: '5' }))
      .toEqual(NUMERIC_STRING_VALUES_EXPECTED);
  });

  test('boolean values', () => {
    const BOOLEAN_VALUES_INPUT = `
// ###[IF]enabled=true;sed=/off/on/;
status: off`;
    const BOOLEAN_VALUES_EXPECTED = `
status: on`;
    expect(commentDirective(BOOLEAN_VALUES_INPUT, { enabled: true }))
      .toEqual(BOOLEAN_VALUES_EXPECTED);
  });

  test('undefined flags default to no match', () => {
    const UNDEFINED_FLAGS_INPUT = `
// ###[IF]undefined_flag=1;sed=/old/new/;
old value`;
    const UNDEFINED_FLAGS_EXPECTED = `
old value`;
    expect(commentDirective(UNDEFINED_FLAGS_INPUT, {}))
      .toEqual(UNDEFINED_FLAGS_EXPECTED);
  });


  test('multiple directives on same content', () => {
    const MULTIPLE_DIRECTIVES_INPUT = `
// ###[IF]first=1;sed=/a/b/;
// ###[IF]second=1;sed=/b/c/;
a value`;
    const MULTIPLE_DIRECTIVES_EXPECTED = `
c value`;
    expect(commentDirective(MULTIPLE_DIRECTIVES_INPUT, { first: 1, second: 1 }))
      .toEqual(MULTIPLE_DIRECTIVES_EXPECTED);
  });


  test('min length directive', () => {
    const MIN_INPUT = `
// ###[IF]a=1;rm=1L;
some content

// ###[IF]a=1;rm=1L;
// ###[IF]a=1;rm=1L
// ###[IF]a=1;rm=1L;
some content
some content
some content

`;
    expect(commentDirective(MIN_INPUT, { a: 1 }).trim()).toEqual('');
  });

});


// -----------------------------------------------------------------------------
// @id::error handling
// -----------------------------------------------------------------------------
describe('error handling', () => {

  test('invalid directive syntax is ignored', () => {
    const ERROR_INVALID_DIRECTIVE_SYNTAX_INPUT = `
  // ###[IF]invalid syntax here
  content`;
    expect(commentDirective(ERROR_INVALID_DIRECTIVE_SYNTAX_INPUT, {}))
      .toEqual(ERROR_INVALID_DIRECTIVE_SYNTAX_INPUT);
  });


  test('invalid remove lines syntax is ignored', () => {
    const ERROR_INVALID_RM_LINES_INPUT = `
// ###[IF]test=1;rm=invalid;
line1
line2`;
    const ERROR_INVALID_RM_LINES_EXPECTED = `
line1
line2`;
    expect(commentDirective(ERROR_INVALID_RM_LINES_INPUT, { test: 1 }))
      .toEqual(ERROR_INVALID_RM_LINES_EXPECTED);
  });

  test('bad whitespace variations in directives', () => {
    const ERROR_BAD_WHITESPACE_INPUT = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;
    const ERROR_BAD_WHITESPACE_EXPECTED = `
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`;
    expect(commentDirective(ERROR_BAD_WHITESPACE_INPUT, { 'test ': 1 }))
      .toEqual(ERROR_BAD_WHITESPACE_EXPECTED);
  });

});


describe('error handling - throw option enable', () => {
  test('invalid directive syntax is ignored', () => {
    expect(() => {
      commentDirective(`
    // ###[IF]invalid syntax here
    content`, {}, { throw: true });
    }).toThrow();
  });

  test('invalid remove lines syntax is ignored', () => {
    expect(() => {
      commentDirective(`// ###[IF]test=1;rm=invalid;
line1
line2`, { test: 1 }, { throw: true });
    }).toThrow();
  });

  test('bad whitespace variations in directives', () => {
    expect(() => {
      commentDirective(`
  //   ###[IF]  test = 1 ; sed = /old/new/ ;
old value`, { test: 1 }, { throw: true });
    }).toThrow();
  });
});


// -----------------------------------------------------------------------------
// @id::real-world javascriptin scenarios
// -----------------------------------------------------------------------------
describe('real-world scenarios', () => {
  test('build configuration switching', () => {
    const BUILD_CONFIG_SWITCHING_INPUT = `
// ###[IF]env=production;sed=/development.api.com/production.api.com/g;

const config = {
  apiUrl: 'https://development.api.com',
  // ###[IF]env=production;rm=1L;
  debug: true,
  // ###[IF]env=development;un=comment;
  // ###[IF]env=production;rm=1L;
  /*verbose: true*/
};`;
    const BUILD_CONFIG_SWITCHING_EXPECTED_PROD = `

const config = {
  apiUrl: 'https://production.api.com',
};`;

    const BUILD_CONFIG_SWITCHING_EXPECTED_DEV = `

const config = {
  apiUrl: 'https://development.api.com',
  debug: true,
  verbose: true
};`;

    expect(commentDirective(BUILD_CONFIG_SWITCHING_INPUT, { env: 'production' }))
      .toEqual(BUILD_CONFIG_SWITCHING_EXPECTED_PROD);
    expect(commentDirective(BUILD_CONFIG_SWITCHING_INPUT, { env: 'development' }))
      .toEqual(BUILD_CONFIG_SWITCHING_EXPECTED_DEV);
  });

  test('complex-ish template', () => {
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
    const COMPLEX_TEMPLATE_EXPECTED_1 = `
  // @internal default/lookup value assignment
  [ [idG, idF], [fgG, fgF], [lvlG, lvlF], [pluginG, pluginF], [defsG, defsF] ] = ([
    ['ID', id, '{}'], // PTAG_ID
    ['FG'], // PTAG_FG
    ['FG'], // PTAG_FG

    ['LVL', level, 5], // PTAG_LVL
    // plugin is globalThis only; un-JSON-able
    ['PLG', pluginFn], // PTAG_PLG
    // non-primitive values that are JSON-able
    ['DEF', null, eobj], // PTAG_DEF
  ] as const).map(getEnvDefVal as any) as [
    [string, string | null], // id
    [string | null | undefined, string | null | undefined], // fg
    [LogLevel, LogLevel | null], // lvl
    [PluginFn<M> | null | undefined, PluginFn<M> | undefined | null], // plugin
    [Partial<DefinitionsD>, Partial<DefinitionsD | null>], // styles
  ],`;

    const COMPLEX_TEMPLATE_EXPECTED_0 = `
  // @internal default/lookup value assignment
  [ [idG, idF], [lvlG, lvlF], [pluginG, pluginF], [defsG, defsF] ] = ([
    ['ID', id, '{}'], // PTAG_ID

    ['LVL', level, 5], // PTAG_LVL
    // plugin is globalThis only; un-JSON-able
    ['PLG', pluginFn], // PTAG_PLG
    // non-primitive values that are JSON-able
    ['DEF', null, eobj], // PTAG_DEF
  ] as const).map(getEnvDefVal as any) as [
    [string, string | null], // id
    [LogLevel, LogLevel | null], // lvl
    [PluginFn<M> | null | undefined, PluginFn<M> | undefined | null], // plugin
    [Partial<DefinitionsD>, Partial<DefinitionsD | null>], // styles
  ],`;


    expect(commentDirective(COMPLEX_TEMPLATE_INPUT, { is_fg: 1 }, {
      multi: [/\s*\/\*/, /\s*\*\/\s*/],
      keepPadIn: false,
    }))
      .toEqual(COMPLEX_TEMPLATE_EXPECTED_1);
    expect(commentDirective(COMPLEX_TEMPLATE_INPUT, { is_fg: 0 }, {
      multi: [/\s*\/\*/, /\s*\*\/\s*/],
      keepPadIn: false,
    }))
      .toEqual(COMPLEX_TEMPLATE_EXPECTED_0);
  });

  test('feature flag management', () => {
    const FEATURE_FLAG_INPUT = `
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
    const FEATURE_FLAG_NEW_UI_EXPECTED = `
class MyComponent {
  render() {
    return (
      <div>
         <NewUIComponent /> 
      </div>
    );
  }
}`;

    // with new UI disabled
    const FEATURE_FLAG_OLD_UI_EXPECTED = `
class MyComponent {
  render() {
    return (
      <div>
        {/* <NewUIComponent /> */}
        <OldUIComponent />
        <LegacyStyles />
      </div>
    );
  }
}`;

    expect(commentDirective(FEATURE_FLAG_INPUT, { feature_new_ui: 1 }, {
      single: [/\{\/\*s*/, /s*\*\/\}/],
      multi: [/\{\/\*/, /\*\/\}/],
    })).toEqual(FEATURE_FLAG_NEW_UI_EXPECTED);

    expect(commentDirective(FEATURE_FLAG_INPUT, { feature_new_ui: 0 }, {
      single: [/\{\/\*s*/, /s*\*\/\}/],
      multi: [/\{\/\*/, /\*\/\}/],
    })).toEqual(FEATURE_FLAG_OLD_UI_EXPECTED);
  });

});


// -----------------------------------------------------------------------------
// @id::Botxamples
// -----------------------------------------------------------------------------
describe('Bot Examples', () => {
  test('Basic Usage', () => {
    const BOT_BASIC_USAGE_INPUT = `
    // ###[IF]env=production;sed=/localhost:3000/api.example.com/;
    const apiUrl = 'http://localhost:3000/api';`;
    const BOT_BASIC_USAGE_EXPECTED = `
    const apiUrl = 'http://api.example.com/api';`;
    expect(commentDirective(BOT_BASIC_USAGE_INPUT, { env: 'production' }))
      .toEqual(BOT_BASIC_USAGE_EXPECTED);
  });

  // Supported Actions: Text Replacement

  test('Text Replacement - Basic', () => {
    const BOT_TEXT_REPLACEMENT_BASIC_INPUT = `
    // ###[IF]debug=true;sed=/console.log/logger.debug/;
    console.log('Debug message');
    console.error('Error message');
    `;
    const BOT_TEXT_REPLACEMENT_BASIC_EXPECTED = `
    logger.debug('Debug message');
    console.error('Error message');
    `;
    expect(commentDirective(BOT_TEXT_REPLACEMENT_BASIC_INPUT, { debug: true }))
      .toEqual(BOT_TEXT_REPLACEMENT_BASIC_EXPECTED);
  });

  test('Text Replacement - Global replacement with flags', () => {
    const BOT_TEXT_REPLACEMENT_GLOBAL_FLAGS_INPUT = `
    // ###[IF]prod=1;sed=/dev-/prod-/g;
    const devServer = 'dev-api.com';
    const devDatabase = 'dev-db.com';
    const devCache = 'dev-redis.com';
    `;
    const BOT_TEXT_REPLACEMENT_GLOBAL_FLAGS_EXPECTED = `
    const devServer = 'prod-api.com';
    const devDatabase = 'prod-db.com';
    const devCache = 'prod-redis.com';
    `;
    expect(commentDirective(BOT_TEXT_REPLACEMENT_GLOBAL_FLAGS_INPUT, { prod: 1 }))
      .toEqual(BOT_TEXT_REPLACEMENT_GLOBAL_FLAGS_EXPECTED);
  });

  test('Text Replacement - Case-insensitive replacement', () => {
    const BOT_TEXT_REPLACEMENT_CASE_INSENSITIVE_INPUT = `
    // ###[IF]normalize=1;sed=/ERROR/error/i;
    System ERROR occurred
    Another Error detected
    `;
    const BOT_TEXT_REPLACEMENT_CASE_INSENSITIVE_EXPECTED = `
    System error occurred
    Another Error detected
    `;
    expect(commentDirective(BOT_TEXT_REPLACEMENT_CASE_INSENSITIVE_INPUT, { normalize: 1 }))
      .toEqual(BOT_TEXT_REPLACEMENT_CASE_INSENSITIVE_EXPECTED);
  });

  test('Text Replacement - Multi-line replacement (2L)', () => {
    const BOT_TEXT_REPLACEMENT_MULTILINE_INPUT = `
    // ###[IF]refactor=1;sed=/oldFunction/newFunction/2L;
    const result1 = oldFunction(data);
    const result2 = oldFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
    const BOT_TEXT_REPLACEMENT_MULTILINE_EXPECTED = `
    const result1 = newFunction(data);
    const result2 = newFunction(moreData);
    const result3 = oldFunction(evenMore); // This won't be replaced
    `;
    expect(commentDirective(BOT_TEXT_REPLACEMENT_MULTILINE_INPUT, { refactor: 1 }))
      .toEqual(BOT_TEXT_REPLACEMENT_MULTILINE_EXPECTED);
  });

  // Supported Actions: Remove Lines

  test('Remove Lines - rm=3L', () => {
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
    console.log('This will remain');
    `;
    expect(commentDirective(BOT_REMOVE_LINES_INPUT, { removeLogs: 1 }))
      .toEqual(BOT_REMOVE_LINES_EXPECTED);
  });

  // Supported Actions: Remove Comments

  test('Remove Comments - rm=comment', () => {
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
    function importantFunction() {
      return 'result';
    }
    `;
    expect(commentDirective(BOT_REMOVE_COMMENTS_INPUT, { minify: 1 }))
      .toEqual(BOT_REMOVE_COMMENTS_EXPECTED);
  });

  // Supported Actions: Uncomment Code

  test('Uncomment Code - un=comment', () => {
    const BOT_UNCOMMENT_CODE_INPUT = `
    // ###[IF]enableFeature=1;un=comment;
    /*function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }*/`;
    const BOT_UNCOMMENT_CODE_EXPECTED = `
    function newFeature() {
      console.log('New feature enabled!');
      return processData();
    }`;
    expect(commentDirective(BOT_UNCOMMENT_CODE_INPUT, { enableFeature: 1 }))
      .toEqual(BOT_UNCOMMENT_CODE_EXPECTED);
  });

  // Language Support

  test('Language Support - C-like (Rust example)', () => {
    const BOT_RUST_CODE_INPUT = `
    fn main() {
        // ###[IF]feature_x=1;sed=/println!(/log::info!(/;
        println!("Debug message");
    }
    `;
    const BOT_RUST_CODE_EXPECTED = `
    fn main() {
        log::info!("Debug message");
    }
    `;
    expect(commentDirective(BOT_RUST_CODE_INPUT, { feature_x: 1 }, cLike))
      .toEqual(BOT_RUST_CODE_EXPECTED);
  });

  test('Language Support - Python example', () => {
    const BOT_PYTHON_CODE_INPUT = `
    # ###[IF]debug=1;sed=/print(/logging.info(/g;
    print('Hello world')
    def calculate():
        print('Calculating...')
    `;
    const BOT_PYTHON_CODE_EXPECTED = `
    logging.info('Hello world')
    def calculate():
        logging.info('Calculating...')
    `;
    expect(commentDirective(BOT_PYTHON_CODE_INPUT, { debug: 1 }, python))
      .toEqual(BOT_PYTHON_CODE_EXPECTED);
  });

  test('Language Support - HTML example', () => {
    const BOT_HTML_TEMPLATE_INPUT = `
    <!-- ###[IF]prod=1;sed=/localhost/example.com/g; -->
    <script src="http://localhost:3000/api.js"></script>
    <link href="http://localhost:3000/styles.css" rel="stylesheet">
    `;
    const BOT_HTML_TEMPLATE_EXPECTED = `
    <script src="http://example.com:3000/api.js"></script>
    <link href="http://example.com:3000/styles.css" rel="stylesheet">
    `;
    expect(commentDirective(BOT_HTML_TEMPLATE_INPUT, { prod: 1 }, html))
      .toEqual(BOT_HTML_TEMPLATE_EXPECTED);
  });

  test('Language Support - CSS example', () => {
    const BOT_CSS_CODE_INPUT = `
    body {
      /* ###[IF]theme=dark;sed=/white/black/; */
      background-color: white;
      color: black;
    }
    `;
    const BOT_CSS_CODE_EXPECTED = `
    body {
      background-color: black;
      color: black;
    }
    `;
    expect(commentDirective(BOT_CSS_CODE_INPUT, { theme: 'dark' }, css))
      .toEqual(BOT_CSS_CODE_EXPECTED);
  });

  test('Language Support - Bash/Shell example', () => {
    const BOT_BASH_SCRIPT_INPUT = `
    #!/bin/bash
    # ###[IF]env=prod;sed=/localhost/production.server.com/;
    curl http://localhost:8080/health
    echo "Server status checked"
    `;
    const BOT_BASH_SCRIPT_EXPECTED = `
    #!/bin/bash
    curl http://production.server.com:8080/health
    echo "Server status checked"
    `;
    expect(commentDirective(BOT_BASH_SCRIPT_INPUT, { env: 'prod' }, bash))
      .toEqual(BOT_BASH_SCRIPT_EXPECTED);
  });

  // Advanced Examples

  test('Advanced - Build Configuration Management (development)', () => {
    const BOT_BUILD_CONFIG_DEV_INPUT = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://production.api.com',
      // ###[IF]env=production;rm=2L;
      debug: true,
      verboseLogging: true,
      // ###[IF]env=production;un=comment;rm=comment;
      // compressionEnabled: true,
      // ###[IF]env=development;un=comment;rm=comment;
      /*hotReload: true,*/
    };
    `;
    const BOT_BUILD_CONFIG_DEV_EXPECTED = `
    const config = {
      apiUrl: 'https://localhost:3000',
      debug: true,
      verboseLogging: true,
      hotReload: true,
    };
    `;
    expect(commentDirective(BOT_BUILD_CONFIG_DEV_INPUT, { env: 'development' }))
      .toEqual(BOT_BUILD_CONFIG_DEV_EXPECTED);
  });

  test('Advanced - Build Configuration Management (production)', () => {
    const BOT_BUILD_CONFIG_PROD_INPUT = `
    // ###[IF]env=development;sed=/production.api.com/localhost:3000/g;
    const config = {
      apiUrl: 'https://production.api.com',
      // ###[IF]env=production;rm=2L;
      debug: true,
      verboseLogging: true,
      // ###[IF]env=production;un=comment;rm=comment;
      // compressionEnabled: true,
      // ###[IF]env=development;un=comment;rm=comment;
      /*hotReload: true,*/
    };
    `;
    const BOT_BUILD_CONFIG_PROD_EXPECTED = `
    const config = {
      apiUrl: 'https://production.api.com',
      compressionEnabled: true,
    };
    `;
    expect(commentDirective(BOT_BUILD_CONFIG_PROD_INPUT, { env: 'production' }))
      .toEqual(BOT_BUILD_CONFIG_PROD_EXPECTED);
  });

  test('Advanced - Feature Flag Implementation', () => {
    const BOT_FEATURE_FLAG_INPUT = `
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
    const BOT_FEATURE_FLAG_CACHE_EXPECTED = `
    class UserService {
      async getUser(id: string) {

        const cached = await this.cache.get(id);
        if (cached) return cached;

        const user = await this.database.findUser(id);


        await this.cache.set(id, user, 3600);

        return user;
      }
    }
    `;
    expect(commentDirective(BOT_FEATURE_FLAG_INPUT, { cache_enabled: 1 }))
      .toEqual(BOT_FEATURE_FLAG_CACHE_EXPECTED);

    const BOT_FEATURE_FLAG_FULL_EXPECTED = `
    class UserService {
      async getUser(id: string) {

        const cached = await this.cache.get(id);
        if (cached) return cached;

        const user = await this.database.findUser(id);

        this.analytics.track('user_fetched', { userId: id });

        await this.cache.set(id, user, 3600);

        return user;
      }
    }
    `;
    expect(commentDirective(BOT_FEATURE_FLAG_INPUT, { cache_enabled: 1, analytics: 1 }))
      .toEqual(BOT_FEATURE_FLAG_FULL_EXPECTED);
  });


  // Custom Comment Formats
  test('Custom Comment Formats - SQL example', () => {
    const BOT_SQL_SCRIPT_INPUT = `
    -- ###[IF]env=prod;sed=/test_db/prod_db/;
    USE test_db;
    SELECT * FROM users;
    `;
    const BOT_SQL_SCRIPT_EXPECTED = `
    USE prod_db;
    SELECT * FROM users;
    `;
    expect(commentDirective(BOT_SQL_SCRIPT_INPUT, { env: 'prod' }, sql))
      .toEqual(BOT_SQL_SCRIPT_EXPECTED);
  });

  // Error Handling
  test('Error Handling - Unknown actions are ignored', () => {
    const BOT_ERROR_UNKNOWN_ACTION_INPUT = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
    const BOT_ERROR_UNKNOWN_ACTION_EXPECTED = `
    // ###[IF]test=1;unknown=action;
    console.log('This line remains unchanged');
    `;
    expect(commentDirective(BOT_ERROR_UNKNOWN_ACTION_INPUT, { test: 1 }))
      .toEqual(BOT_ERROR_UNKNOWN_ACTION_EXPECTED);
  });

  test('Error Handling - Invalid sed patterns are ignored', () => {
    const BOT_ERROR_INVALID_SED_INPUT = `
    // ###[IF]test=1;sed=invalid_pattern;
    console.log('This line remains unchanged');
    `;
    const BOT_ERROR_INVALID_SED_EXPECTED = `
    console.log('This line remains unchanged');
    `;
    expect(commentDirective(BOT_ERROR_INVALID_SED_INPUT, { test: 1 }))
      .toEqual(BOT_ERROR_INVALID_SED_EXPECTED);
  });
});

