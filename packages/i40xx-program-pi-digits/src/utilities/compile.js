/* eslint-disable no-console */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import compiler from 'i40xx-asm';
import { preprocessFile } from 'i40xx-preprocess';

const MAX_ATTEMPTS_TO_REARRANGE_CODE = 15;

// eslint-disable-next-line consistent-return
export const compileCodeForTest = (fileName, funcName) => {
  const preprocessedCode = preprocessFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../', fileName));

  let testCode = `
    JMS entrypoint
    
    ${preprocessedCode}
    
    entrypoint:
      JMS ${funcName}
  `;

  for (let attempts = 0; attempts < MAX_ATTEMPTS_TO_REARRANGE_CODE; attempts++) {
    const { data: rom, functions, errors, labelsOffsets } = compiler(testCode);
    if (!errors?.length) {
      console.log(`Source code has been compiled, ram size = ${rom.length} bytes`);
      return { rom, sourceCode: testCode, labelsOffsets };
    }

    if (errors[0].code !== 'short_jump_another_bank') {
      console.log('COULD NOT PARSE SOURCE CODE!');
      console.log(errors);
      process.exit(1);
    }

    const sortedFns = functions.sort((a, b) => a.bytecodeOffset - b.bytecodeOffset);
    const { offset: instrOffset } = errors[0];
    const closestFunction = sortedFns[sortedFns.findIndex(({ bytecodeOffset }) => bytecodeOffset > instrOffset) - 1];
    const paddingCount = 0x100 - (instrOffset & 0xFF);
    const compilablePart = testCode.substring(0, closestFunction.sourceCodeOffset);
    const paddedPart = testCode.substring(closestFunction.sourceCodeOffset);
    testCode = `${compilablePart}\n${'  NOP\n'.repeat(paddingCount)}\n${paddedPart}`;
  }

  console.log('COULD NOT REARRANGE CODE TO AVOID PARSING EXCEPTION!');
  process.exit(1);
};
