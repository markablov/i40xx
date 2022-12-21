/* eslint-disable no-console */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import compiler from 'i40xx-asm';
import { preprocessFile } from 'i40xx-preprocess';

export const compileCodeForTest = (fileName, funcName) => {
  const preprocessedCode = preprocessFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../', fileName));

  const testCode = `
    JMS entrypoint
    
    ${preprocessedCode}
    
    entrypoint:
      JMS ${funcName}
  `;

  const { data: rom, errors } = compiler(testCode);
  if (Array.isArray(errors) && errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  console.log(`Source code has been compiled, ram size = ${rom.length} bytes`);

  return { rom, sourceCode: testCode };
};
