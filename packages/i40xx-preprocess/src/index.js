import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { extractDirectives } from './workers/directives.js';

/*
 * Transform single file
 */
const transformSourceCode = (sourceCode, { defines }) => sourceCode.replace(
  /\$(\w+)(\s*\.\s*([$\w]+))?/g,
  (match, identifier, _, concat) => (
    `${defines.get(identifier)}${(concat?.[0] === '$' ? defines.get(concat.substring(1)) : concat) ?? ''}`
  ),
);

/*
 * Opens assembly source code and returns preprocessed listing
 */
export function preprocessFile(filePath, { processDefinesOnly = false } = {}) {
  const unvisited = [filePath];
  const sourceCodeFiles = new Map();
  const defines = new Map();

  while (unvisited.length) {
    const currentPath = unvisited.shift();
    const codeRaw = readFileSync(currentPath, 'utf-8');
    const { directives, sourceCode } = extractDirectives(codeRaw);
    sourceCodeFiles.set(currentPath, sourceCode);

    for (const directive of directives) {
      const [, includePath] = directive.match(/^%include "(.+)"$/) || [];
      if (includePath) {
        const fullPathForInclude = path.resolve(path.dirname(currentPath), includePath);
        if (!sourceCodeFiles.has(fullPathForInclude)) {
          unvisited.push(fullPathForInclude);
        }
        continue;
      }

      const [, identifier, replacement] = directive.match(/^%define (\w+)\s+(\w+)$/) || [];
      if (identifier && replacement) {
        defines.set(identifier, replacement);
      }
    }
  }

  if (processDefinesOnly) {
    return transformSourceCode(sourceCodeFiles.get(filePath), { defines });
  }

  return [...sourceCodeFiles.values()].map((sourceCode) => transformSourceCode(sourceCode, { defines })).join('\n');
}
