/**                                                                       @about
@file: index.pad.test.ts
@desc: test for the keepPad* logic - tests all varations
       uses manual str compare __snapshots__
***                                                                           */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
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

const SNAPS = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__');
const SPC = ' '.repeat(6);
const SPL = '-'.repeat(60);
const SLL =  '~'.repeat(60) + '\n';


const TESTS: [id: string, test: string, options: Partial<CommentOptions> | null][] = [
  [
    `pad.single.part.manual.snap`,
    `
${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}// test${SPC}
${SPL}
${SPC}// test${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}// test${SPC}i${SPC}
${SPL}
${SPC}// test${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
 i  // test${SPC}
${SPL}
 i  // test${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
// test${SPC}
${SPL}
// test${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}// test${SPC}
${SPL}
${SPC}// test${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}// test${SPC}i${SPC}
${SPL}
${SPC}// test${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
 i  // test${SPC}
${SPL}
 i  // test${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
// test${SPC}
${SPL}
// test${SPC}
${SLL}

`,
    {
      single: [/\s*\/\/\s*/, null],
      keepEmpty: true,
    },
  ],


  [
    `pad.single.full.manual.snap`,
    `
<!-- ###[IF]test=1;un=comment;${SPC} -->
${SPC}<!--${SPC}test${SPC}-->${SPC}
${SPL}
${SPC}<!--${SPC}test${SPC}-->${SPC}
${SLL}

<!-- ###[IF]test=1;un=comment;${SPC} -->
${SPC}i${SPC}<!--${SPC}test${SPC}-->${SPC}i${SPC}
${SPL}
${SPC}i${SPC}<!--${SPC}test${SPC}-->${SPC}i${SPC}
${SLL}

<!-- ###[IF]test=1;rm=comment;${SPC} -->
${SPC}<!--${SPC}test${SPC}-->${SPC}
${SPL}
${SPC}<!--${SPC}test${SPC}-->${SPC}
${SLL}

<!-- ###[IF]test=1;rm=comment;${SPC} -->
${SPC}i${SPC}<!--${SPC}test${SPC}-->${SPC}i${SPC}
${SPL}
${SPC}i${SPC}<!--${SPC}test${SPC}-->${SPC}i${SPC}
${SLL}

`,
    {
      single: [/\s*<!--\s*/, /\s*-->\s*/],
      keepEmpty: true,

    },
  ],


  [
    `pad.multi.un.manual.snap`,
    `
${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}/*${SPC}test${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}test${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}/*
${SPC}test${SPC}
*/${SPC}
${SPL}
${SPC}/*
${SPC}test${SPC}
*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}
${SPL}
${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}i${SPC}/*${SPC}test${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}test${SPC}*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}i${SPC}/*
${SPC}test${SPC}
*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*
${SPC}test${SPC}
*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}i${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}i${SPC}
${SPL}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}i${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;un=comment;${SPC}
${SPC}i${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}i${SPC}
${SLL}

`,
    {
      multi: [/\s*\/\*\s*/, /\s*\*\/\s*/],
    },
  ],


  [
    `pad.multi.rm.manual.snap`,
    `
${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}/*${SPC}test${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}test${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}/*
${SPC}test${SPC}
*/${SPC}
${SPL}
${SPC}/*
${SPC}test${SPC}
*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}
${SPL}
${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}
${SPL}
${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}i${SPC}/*${SPC}test${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}test${SPC}*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}i${SPC}/*
${SPC}test${SPC}
*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*
${SPC}test${SPC}
*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}i${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}
${SPC}test${SPC}
test${SPC}
${SPC}test
${SPC}*/${SPC}i${SPC}
${SPL}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}i${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*${SPC}test${SPC}
${SPC}*/${SPC}i${SPC}
${SLL}

${SPC}// ###[IF]test=1;rm=comment;${SPC}
${SPC}i${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}i${SPC}
${SPL}
${SPC}i${SPC}/*
${SPC}test${SPC}${SPC}*/${SPC}i${SPC}
${SLL}

`,
    {
      multi: [/\s*\/\*\s*/, /\s*\*\/\s*/],
      keepEmpty: true,
    },
  ],

];


type BooleanCombo<T extends string> = Record<T, boolean>;
const generateListCombinations = <T extends string>(
  ...keys: T[]
): BooleanCombo<T>[] => {
  const combinations: BooleanCombo<T>[] = [];
  const total = 1 << keys.length;
  for (let i = 0; i < total; i++) {
    const combo = {} as BooleanCombo<T>;
    for (let bit = 0; bit < keys.length; bit++) {
      combo[keys[bit] as T] = !!(i & (1 << (keys.length - 1 - bit)));
    }
    combinations.push(combo);
  }
  return combinations;
};


describe('kepPad*', () => {
  for (const [file, input, options] of TESTS) {
    let result = '';
    for (const ops of generateListCombinations('keepPadStart', 'keepPadIn', 'keepPadEnd')) {
      const cresult = commentDirective(input, {test: 1}, {
        keepDirective: true,
        keepPadEmpty: true,
        ...ops,
        ...options,
      }).replaceAll(' ', '⠐');

      result += [
        '\n\n' + '='.repeat(80),
        `\n${Object.entries(ops).filter(v => v[1]).map(v => v[0]).join(', ')}`,
        `\n${JSON.stringify(ops)}\n`,
        cresult,
      ].join('');

      // @note -> indv snapshots are a bit of a pain to work with
      // test(`${file} -> ${sopts.length ? sopts : 'none'}`, () => expect(cresult).toMatchSnapshot() );
    }

    test(file, () => {
      // fs.writeFileSync(join(SNAPS, file + '.out'), result.trim())
      expect(result.trim()).toEqual(fs.readFileSync(join(SNAPS, file)).toString().trim());
    });
  }
});
