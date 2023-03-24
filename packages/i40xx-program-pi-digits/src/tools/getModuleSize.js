/* eslint-disable no-console */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { preprocessFile } from 'i40xx-preprocess';
import { parse } from 'i40xx-asm';

(function main() {
  const moduleNames = process.argv.slice(2);

  let totalSize = 0;

  for (const moduleName of moduleNames) {
    const sourceCodePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../submodules/',
      `${moduleName}.i4040`,
    );

    const sourceCode = preprocessFile(sourceCodePath, { processDefinesOnly: true });

    const sourceCodeWithoutLabels = sourceCode.replace(/^\s*\w+:/igm, '');
    const sourceCodeWithoutExternalCalls = sourceCodeWithoutLabels.replace(
      /(jms|jun|isz rr\d+,|jcn \w+,)\s+(\w+)/ig,
      (match, instruction, labelName, offset) => `${labelName}_${offset}: ${instruction} ${labelName}_${offset}`,
    );

    const { instructions, errors } = parse(sourceCodeWithoutExternalCalls);
    if (errors) {
      console.log(`COULD NOT PARSE SOURCE CODE FOR "${moduleName}"`);
      console.log(errors);
      process.exit(1);
    }

    const moduleSize = instructions.reduce((sum, { opcode }) => sum + opcode.length, 0);
    console.log(`Module size for "${moduleName}" is ${moduleSize} bytes.`);
    totalSize += moduleSize;
  }

  console.log(`Total: ${totalSize}`);
}());
