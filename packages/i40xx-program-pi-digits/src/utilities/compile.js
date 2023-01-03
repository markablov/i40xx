/* eslint-disable no-console */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import compile from 'i40xx-asm';
import { preprocessFile } from 'i40xx-preprocess';

// eslint-disable-next-line consistent-return
export const compileCodeForTest = (fileName, funcName) => {
  const preprocessedCode = preprocessFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../', fileName));

  const testCode = `
    JUN entrypoint
    
    ${preprocessedCode}
    
    entrypoint:
      JMS ${funcName}
  `;

  const { data: rom, errors, labelsOffsets, sourceCode } = compile(testCode, { tryRearrange: true });
  if (errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  return { rom, sourceCode, labelsOffsets };
};
