/* eslint-disable no-console */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import compile from 'i40xx-asm';
import { preprocessFile } from 'i40xx-preprocess';
import { buildRom } from 'i40xx-link';

const wrapSourceCode = (sourceCode, funcName) => `
entrypoint:
  JMS ${funcName}
  HLT

${sourceCode}
`;

// eslint-disable-next-line consistent-return
export const compileCodeForTest = (fileName, funcName) => {
  const dirName = path.dirname(fileURLToPath(import.meta.url));

  console.log('Preprocessing source code...');
  const t0 = performance.now();
  const preprocessedCode = preprocessFile(path.resolve(dirName, '../', fileName));
  const testCode = wrapSourceCode(preprocessedCode, funcName);
  console.log(`Source code has been preprocessed, time elapsed = ${Math.round(performance.now() - t0)}ms`);

  console.log('Compiling code...');
  const t1 = performance.now();
  const { blocks, symbols: blockAddressedSymbols, errors } = compile(testCode);
  console.log(`Source code has been compiled, time elapsed = ${Math.round(performance.now() - t1)}ms`);
  if (errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const cacheFile = path.resolve(dirName, '../../.cache', `${path.parse(fileName).name}.cache`);
  const placementCache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : {};
  console.log('Linking code...');
  const t2 = performance.now();
  const { rom, symbols, sourceMap, placementCache: updatedPlacementCache } = buildRom(
    blocks,
    blockAddressedSymbols,
    { placementCache },
  );
  console.log(`Source code has been linked, time elapsed = ${Math.round(performance.now() - t2)}ms`);

  if (updatedPlacementCache) {
    fs.writeFileSync(cacheFile, JSON.stringify(updatedPlacementCache, undefined, 2));
  }

  return { rom, symbols, sourceMap, sourceCode: testCode };
};
