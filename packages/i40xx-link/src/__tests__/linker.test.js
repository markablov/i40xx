/* eslint-env jest */

import JSON5 from 'json5';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRom } from '../index.js';

const dirName = path.dirname(fileURLToPath(import.meta.url));

const testSpecifiedCase = (caseName) => {
  const blocks = JSON5.parse(readFileSync(path.resolve(dirName, `./data/${caseName}_blocks.json5`), 'utf-8'));
  const expected = JSON5.parse(readFileSync(path.resolve(dirName, `./data/${caseName}_rom.json5`), 'utf-8'));
  const { sourceMap, rom, romSize } = buildRom(blocks, []);
  expect(sourceMap).toMatchObject(expected.sourceMap);
  expect([...rom].slice(0, romSize)).toMatchObject(expected.rom);
};

test('basic code with few calls and jumps', () => testSpecifiedCase('basic_with_calls'));
