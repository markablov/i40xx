/* eslint-disable no-console */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compile } from 'i40xx-asm';
import { preprocessFile } from 'i40xx-preprocess';
import { buildRom } from 'i40xx-link';

const wrapSourceCode = (sourceCode, funcName) => `
entrypoint:
  JMS ${funcName}
  HLT

${sourceCode}
`;

const elapsed = (startTS) => Math.round(performance.now() - startTS);

// eslint-disable-next-line consistent-return
export const compileCodeForTest = (fileName, funcName, options = {}) => {
  const dirName = path.dirname(fileURLToPath(import.meta.url));

  const t0 = performance.now();
  const preprocessedCode = preprocessFile(path.resolve(dirName, '../', fileName));
  const testCode = (options?.wrapSourceCode || wrapSourceCode)(preprocessedCode, funcName);
  console.log(`Source code has been preprocessed, time elapsed = ${elapsed(t0)}ms`);

  const t1 = performance.now();
  const { blocks, symbols: blockAddressedSymbols, errors } = compile(testCode);
  console.log(`Source code has been compiled, time elapsed = ${elapsed(t1)}ms`);
  if (errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const cacheFile = path.resolve(dirName, '../../.cache', `${path.parse(fileName).name}.cache`);
  const placementCache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : {};
  const t2 = performance.now();
  const { rom, symbols, sourceMap, placementCache: updatedPlacementCache, romSize } = buildRom(
    blocks,
    blockAddressedSymbols,
    { placementCache },
  );
  console.log(`Source code has been linked, time elapsed = ${elapsed(t2)}ms, rom size = ${romSize} bytes`);

  if (updatedPlacementCache) {
    fs.writeFileSync(cacheFile, JSON.stringify(updatedPlacementCache, undefined, 2));
  }

  return { rom, symbols, sourceMap, sourceCode: testCode, romSize };
};
