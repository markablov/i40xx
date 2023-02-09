/* eslint-env jest */
/* eslint-disable import/no-dynamic-require, global-require */

const { formBlocksFromInstructions } = require('../../workers/codeBlocksShaper.js');

const testSpecifiedCase = (caseName) => {
  const { instructions } = require(`../data/${caseName}_instructions.js`);
  const expected = require(`../data/${caseName}_blocks.js`);
  expect(formBlocksFromInstructions([], instructions)).toMatchObject(expected);
};

test('basic code with few calls and jumps', () => testSpecifiedCase('basic_with_calls'));
