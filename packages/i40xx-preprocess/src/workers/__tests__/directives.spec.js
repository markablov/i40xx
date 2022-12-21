/* eslint-env jest */

import { extractDirectives } from '../directives.js';

const unident = (str) => str.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');

describe('extractDirectives', () => {
  test('source code with directives', () => {
    const result = extractDirectives(unident(`
      %include "memory.i4040"
      %include "math.i4040"
      
      main:
        hlt
    `));

    expect(result).toMatchObject({
      directives: ['%include "memory.i4040"', '%include "math.i4040"'],
      sourceCode: 'main:\nhlt',
    });
  });

  test('source code without directives', () => {
    const result = extractDirectives(unident(`
      main:
        hlt
    `));

    expect(result).toMatchObject({
      directives: [],
      sourceCode: 'main:\nhlt',
    });
  });

  test('source code with directives only', () => {
    const result = extractDirectives(unident(`
      %include "memory.i4040"
      %include "math.i4040"
    `));

    expect(result).toMatchObject({
      directives: ['%include "memory.i4040"', '%include "math.i4040"'],
      sourceCode: '',
    });
  });
});
