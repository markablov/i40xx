/* eslint-env jest */

const asmLexer = require('../../parser/AsmLexer.js');
const asmParser = require('../../parser/AsmParser.js');
const { INSTRUCTION_TYPES } = require('../../const.js');

const matchParseResults = (sourceCode, expected, error) => {
  const { tokens } = asmLexer.tokenize(sourceCode.toLowerCase());
  const { instructions } = asmParser.parse(tokens) || {};

  if (error) {
    expect(asmParser.errors).toHaveLength(1);
    expect(asmParser.errors[0].message).toEqual(error);
  } else {
    expect(instructions).toMatchObject(expected);
  }
};

const buildRegularInstruction = (opcode) => ({
  opcode: Array.isArray(opcode) ? opcode : [opcode],
  refInstructionIdx: null,
  sourceCodeLine: 1,
  type: INSTRUCTION_TYPES.Regular,
});

describe('One-byte instructions without arguments', () => {
  const OPCODE_BASE = 0xE0;

  const instructions = [
    'wrm', 'wmp', 'wrr', 'wpm', 'wr0', 'wr1', 'wr2', 'wr3', 'sbm', 'rdm', 'rdr', 'adm', 'rd0', 'rd1', 'rd2', 'rd3',
    'clb', 'clc', 'iac', 'cmc', 'cma', 'ral', 'rar', 'tcc', 'dac', 'tcs', 'stc', 'daa', 'kbp', 'dcl',
  ];

  test('NOP instruction', () => matchParseResults('nop', [buildRegularInstruction(0x00)]));

  for (const [idx, instr] of instructions.entries()) {
    test(
      `${instr.toUpperCase()} instruction`,
      () => matchParseResults(instr, [buildRegularInstruction(OPCODE_BASE + idx)]),
    );
  }
});

describe('Intel 4040 instructions', () => {
  const OPCODE_BASE = 0x02;

  const instructions = [
    'bbs', 'lcr', 'or4', 'or5', 'an6', 'an7', 'db0', 'db1', 'sb0', 'sb1', 'ein', 'din', 'rpm',
  ];

  test('HLT instruction', () => {
    matchParseResults(
      'hlt',
      [{ opcode: [0x01], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.Halt }],
    );
  });

  for (const [idx, instr] of instructions.entries()) {
    test(
      `${instr.toUpperCase()} instruction`,
      () => matchParseResults(instr, [buildRegularInstruction(OPCODE_BASE + idx)]),
    );
  }
});

test('Undefined label', () => matchParseResults('jun unknown_label', null, 'Error: Unknown label unknown_label'));

test('Duplicated label definition', () => matchParseResults('label: nop\nlabel: nop', null, 'Duplicated definition for label'));

describe('Instructions with register as argument', () => {
  test('LD instruction', () => matchParseResults('ld rr1', [buildRegularInstruction(0xA1)]));
  test('XCH instruction', () => matchParseResults('xch rr2', [buildRegularInstruction(0xB2)]));
  test('ADD instruction', () => matchParseResults('add rr3', [buildRegularInstruction(0x83)]));
  test('SUB instruction', () => matchParseResults('sub rr4', [buildRegularInstruction(0x94)]));
  test('INC instruction', () => matchParseResults('inc rr15', [buildRegularInstruction(0x6F)]));
  test('incorrect register', () => matchParseResults('inc rr16', null, 'Redundant input, expecting EOF but found: 6'));
  test('incorrect argument', () => matchParseResults('add 2', null, 'Expecting token of type --> Register <-- but found --> \'2\' <--'));
  test('missing argument', () => matchParseResults('ld', null, 'Expecting token of type --> Register <-- but found --> \'\' <--'));
});

describe('Instructions with register pair as argument', () => {
  test('JIN instruction', () => matchParseResults('jin r1', [buildRegularInstruction(0x33)]));
  test('SRC instruction', () => matchParseResults('src r2', [buildRegularInstruction(0x25)]));
  test('FIN instruction', () => matchParseResults('fin r3', [buildRegularInstruction(0x36)]));
  test('incorrect register', () => matchParseResults('src r9', null, 'Expecting token of type --> RegisterPair <-- but found --> \'r9\' <--'));
});

describe('Instructions with 4-bit data as argument', () => {
  test('BBL instruction', () => {
    matchParseResults(
      'bbl 10',
      [{ opcode: [0xCA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.Return }],
    );
  });

  test('LDM instruction', () => matchParseResults('ldm 0xF', [buildRegularInstruction(0xDF)]));

  test('too big value', () => matchParseResults('ldm 17', null, 'Error: Argument is too big, should be 0xF or less'));
});

describe('FIM instruction', () => {
  test('valid', () => matchParseResults('fim r0, 0xAA', [buildRegularInstruction([0x20, 0xAA])]));
  test('too big value', () => matchParseResults('fim r0, 260', null, 'Error: Argument is too big, should be 0xFF or less'));
});

describe('Instructions with 12-bit address as argument', () => {
  test('JUN instruction', () => {
    matchParseResults(
      'jun 0xABC',
      [{ opcode: [0x4A, 0xBC], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.FarJump }],
    );
  });

  test('JMS instruction', () => {
    matchParseResults(
      'jms 09:0xFA',
      [{ opcode: [0x59, 0xFA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.Call }],
    );
  });

  test('JMS instruction with label', () => {
    matchParseResults(
      'jms label\nlabel: nop',
      [
        { opcode: [0x50, 0x00], refInstructionIdx: 1, sourceCodeLine: 1, type: INSTRUCTION_TYPES.Call },
        { opcode: [0x00], refInstructionIdx: null, sourceCodeLine: 2, type: INSTRUCTION_TYPES.Regular },
      ],
    );
  });

  test('too big value', () => matchParseResults('jun 4096', null, 'Redundant input, expecting EOF but found: 6'));

  test('too big value with ROM address', () => matchParseResults('jun 17:0x00', null, 'Redundant input, expecting EOF but found: :'));
});

describe('ISZ instruction', () => {
  test('valid', () => {
    matchParseResults(
      'isz rr0, 0xAA',
      [{ opcode: [0x70, 0xAA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.JumpConditional }],
    );
  });

  test('valid with ROM address', () => {
    matchParseResults(
      'isz rr0, 00:0xAA',
      [{ opcode: [0x70, 0xAA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.JumpConditional }],
    );
  });

  test('valid with ROM label', () => {
    matchParseResults(
      'isz rr0, label\nlabel: nop',
      [
        { opcode: [0x70, 0x00], refInstructionIdx: 1, sourceCodeLine: 1, type: INSTRUCTION_TYPES.JumpConditional },
        { opcode: [0x00], refInstructionIdx: null, sourceCodeLine: 2, type: INSTRUCTION_TYPES.Regular },
      ],
    );
  });
});

describe('JCN instruction', () => {
  test('valid', () => {
    matchParseResults(
      'jcn nz, 0xAA',
      [{ opcode: [0x1C, 0xAA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.JumpConditional }],
    );
  });

  test('valid 2', () => {
    matchParseResults(
      'jcn ct, 0xAA',
      [{ opcode: [0x13, 0xAA], refInstructionIdx: null, sourceCodeLine: 1, type: INSTRUCTION_TYPES.JumpConditional }],
    );
  });
});
