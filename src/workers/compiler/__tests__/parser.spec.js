/* eslint-env jest */

import parse from '../parser/parser.js';

const matchParseResults = (source, data, error) => {
  const { errors: parseErrors, data: parseData } = parse(source);
  return error
    ? (expect(parseErrors).toHaveLength(1) && expect(parseErrors[0]).toMatch(error))
    : expect(parseData).toEqual(new Uint8Array(data));
};

describe('One-byte instructions without arguments', () => {
  const OPCODE_BASE = 0xE0;

  const instructions = [
    'wrm', 'wmp', 'wrr', 'wpm', 'wr0', 'wr1', 'wr2', 'wr3', 'sbm', 'rdm', 'rdr', 'adm', 'rd0', 'rd1', 'rd2', 'rd3',
    'clb', 'clc', 'iac', 'cmc', 'cma', 'ral', 'rar', 'tcc', 'dac', 'tcs', 'stc', 'daa', 'kbp', 'dcl'
  ];

  test('NOP instruction', () => matchParseResults('nop', [0x00]));

  instructions.forEach((mnemonic, idx) =>
    test(`${mnemonic.toUpperCase()} instruction`, () => matchParseResults(mnemonic, [OPCODE_BASE + idx])));
});
