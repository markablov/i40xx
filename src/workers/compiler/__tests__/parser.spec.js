/* eslint-env jest */

import parse from '../parser/parser.js';

const matchParseResults = (source, data, error) => {
  const { errors: parseErrors, data: parseData } = parse(source);
  if (error) {
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0].message).toEqual(error);
  } else
    expect(parseData).toEqual(new Uint8Array(data));
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

test('Invalid label name', () => matchParseResults('jun some-label', null, 'unexpected character: ->-<- at offset: 8, skipped 1 characters.'));

test('Undefined label', () => matchParseResults('jun unknown_label', null, 'Error: Unknown label unknown_label'));

test('Duplicated label definition', () => matchParseResults('label: nop\nlabel: nop', null, 'Duplicated definition for label'));

describe('Instructions with register as argument', () => {
  test('LD instruction', () => matchParseResults('ld rr1', [0xA1]));
  test('XCH instruction', () => matchParseResults('xch rr2', [0xB2]));
  test('ADD instruction', () => matchParseResults('add rr3', [0x83]));
  test('SUB instruction', () => matchParseResults('sub rr4', [0x94]));
  test('INC instruction', () => matchParseResults('inc rr15', [0x6F]));
  test('incorrect register', () => matchParseResults('inc rr16', null, 'Redundant input, expecting EOF but found: 6'));
  test('incorrect argument', () => matchParseResults('add 2', null, 'Expecting token of type --> Register <-- but found --> \'2\' <--'));
  test('missing argument', () => matchParseResults('ld', null, 'Expecting token of type --> Register <-- but found --> \'\' <--'));
});

describe('Instructions with register pair as argument', () => {
  test('JIN instruction', () => matchParseResults('jin r1', [0x33]));
  test('SRC instruction', () => matchParseResults('src r2', [0x25]));
  test('FIN instruction', () => matchParseResults('fin r3', [0x36]));
  test('incorrect register', () => matchParseResults('src r9', null, 'Expecting token of type --> RegisterPair <-- but found --> \'r9\' <--'));
});

describe('Instructions with 4-bit data as argument', () => {
  test('BBL instruction', () => matchParseResults('bbl 10', [0xCA]));
  test('LDM instruction', () => matchParseResults('ldm 0xF', [0xDF]));
  test('too big value', () => matchParseResults('ldm 17', null, 'Error: Argument is too big, should be 0xF or less'));
});

describe('FIM instruction', () => {
  test('valid', () => matchParseResults('fim r0, 0xAA', [0x20, 0xAA]));
  test('too big value', () => matchParseResults('fim r0, 260', null, 'Error: Argument is too big, should be 0xFF or less'));
});

describe('Instructions with 12-bit address as argument', () => {
  test('JUN instruction', () => matchParseResults('jun 0xABC', [0x4A, 0xBC]));
  test('JMS instruction', () => matchParseResults('jms 09:0xFA', [0x59, 0xFA]));
  test('JMS instruction with label', () => matchParseResults('jms label\nlabel: nop', [0x50, 0x02, 0x00]));
  test('too big value', () => matchParseResults('jun 4096', null, 'Redundant input, expecting EOF but found: 6'));
  test('too big value with bank address', () => matchParseResults('jun 17:0x00', null, 'Redundant input, expecting EOF but found: :'));
});

describe('ISZ instruction', () => {
  test('valid', () => matchParseResults('isz rr0, 0xAA', [0x70, 0xAA]));
  test('valid with bank address', () => matchParseResults('isz rr0, 00:0xAA', [0x70, 0xAA]));
  test('valid with label', () => matchParseResults('isz rr0, label\nlabel: nop', [0x70, 0x02, 0x00]));
  test('valid at 1st bank', () => matchParseResults('nop\n'.repeat(256) + 'isz rr0, 0x1AA', [...(new Array(256).fill(0x00)), 0x70, 0xAA]));
  test('incorrect bank', () => matchParseResults('isz rr0, 0x1AA', null, 'Error: For short jumps, address should be in the same bank as instruction'));
  test('incorrect bank 2', () => matchParseResults('nop\n'.repeat(256) + 'isz rr0, 0xAA', null, 'Error: For short jumps, address should be in the same bank as instruction'));
  test('incorrect bank 3', () => matchParseResults('isz rr0, label\n' + 'nop\n'.repeat(256) + 'label: nop', [], 'Error: For short jumps, address should be in the same bank as instruction'));
  test('incorrect bank 4', () => matchParseResults('isz rr0, 02:0xAA', null, 'Error: For short jumps, address should be in the same bank as instruction'));
});
