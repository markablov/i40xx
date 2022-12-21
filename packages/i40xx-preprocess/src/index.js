import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { extractDirectives } from './workers/directives.js';

/*
 * Opens assembly source code and returns preprocessed listing
 */
export function preprocessFile(filePath) {
  const unvisited = [filePath];
  const sourceCodeFiles = new Map();

  while (unvisited.length) {
    const currentPath = unvisited.shift();
    const codeRaw = readFileSync(currentPath, 'utf-8');
    const { directives, sourceCode } = extractDirectives(codeRaw);
    sourceCodeFiles.set(currentPath, sourceCode);

    const includesFromFile = directives.map((directive) => directive.match(/^%include "(.+)"$/)?.[1]).filter(Boolean);
    for (const includePath of includesFromFile) {
      const fullPathForInclude = path.resolve(path.dirname(currentPath), includePath);
      if (!sourceCodeFiles.has(fullPathForInclude)) {
        unvisited.push(fullPathForInclude);
      }
    }
  }

  return [...sourceCodeFiles.values()].join('\n');
}
