/* eslint-env jest */
/* eslint-disable import/no-dynamic-require, global-require */

const path = require('path');
const fs = require('fs');

const asmLexer = require('../../parser/AsmLexer.js');
const asmParser = require('../../parser/AsmParser.js');

const testSpecifiedCase = (caseName) => {
  const sourceCode = fs.readFileSync(path.resolve(__dirname, `../data/${caseName}.i4040`), 'utf-8');
  const expected = require(`../data/${caseName}_instructions.js`);
  const { tokens } = asmLexer.tokenize(sourceCode.toLowerCase());
  const parsingResult = asmParser.parse(tokens);
  expect(parsingResult).toMatchObject(expected);
};

test('basic code with few calls and jumps', () => testSpecifiedCase('basic_with_calls'));
