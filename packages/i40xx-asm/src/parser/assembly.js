const OPERANDS_GROUPS = Object.freeze({
  None: Symbol('OPERANDS_GROUPS/None'),
  Register: Symbol('OPERANDS_GROUPS/Register'),
  RegisterPair: Symbol('OPERANDS_GROUPS/RegisterPair'),
  Immediate4bit: Symbol('OPERANDS_GROUPS/Immediate4bit'),
  Immediate12bit: Symbol('OPERANDS_GROUPS/Immediate12bit'),
  RegisterPairAndImmediate8bit: Symbol('OPERANDS_GROUPS/RegisterPairAndImmediate8bit'),
  RegisterAndImmediate8bit: Symbol('OPERANDS_GROUPS/RegisterAndImmediate8bit'),
  CondAndImmediate8bit: Symbol('OPERANDS_GROUPS/CondAndImmediate8bit'),
});

const INSTRUCTIONS = new Map([
  ['nop', { opcode: 0x00, operandsGroup: OPERANDS_GROUPS.None }],
  ['rdm', { opcode: 0xE9, operandsGroup: OPERANDS_GROUPS.None }],
  ['rd0', { opcode: 0xEC, operandsGroup: OPERANDS_GROUPS.None }],
  ['rd1', { opcode: 0xED, operandsGroup: OPERANDS_GROUPS.None }],
  ['rd2', { opcode: 0xEE, operandsGroup: OPERANDS_GROUPS.None }],
  ['rd3', { opcode: 0xEF, operandsGroup: OPERANDS_GROUPS.None }],
  ['rdr', { opcode: 0xEA, operandsGroup: OPERANDS_GROUPS.None }],
  ['wrm', { opcode: 0xE0, operandsGroup: OPERANDS_GROUPS.None }],
  ['wr0', { opcode: 0xE4, operandsGroup: OPERANDS_GROUPS.None }],
  ['wr1', { opcode: 0xE5, operandsGroup: OPERANDS_GROUPS.None }],
  ['wr2', { opcode: 0xE6, operandsGroup: OPERANDS_GROUPS.None }],
  ['wr3', { opcode: 0xE7, operandsGroup: OPERANDS_GROUPS.None }],
  ['wrr', { opcode: 0xE2, operandsGroup: OPERANDS_GROUPS.None }],
  ['wmp', { opcode: 0xE1, operandsGroup: OPERANDS_GROUPS.None }],
  ['wpm', { opcode: 0xE3, operandsGroup: OPERANDS_GROUPS.None }],
  ['adm', { opcode: 0xEB, operandsGroup: OPERANDS_GROUPS.None }],
  ['sbm', { opcode: 0xE8, operandsGroup: OPERANDS_GROUPS.None }],
  ['clb', { opcode: 0xF0, operandsGroup: OPERANDS_GROUPS.None }],
  ['clc', { opcode: 0xF1, operandsGroup: OPERANDS_GROUPS.None }],
  ['cmc', { opcode: 0xF3, operandsGroup: OPERANDS_GROUPS.None }],
  ['stc', { opcode: 0xFA, operandsGroup: OPERANDS_GROUPS.None }],
  ['cma', { opcode: 0xF4, operandsGroup: OPERANDS_GROUPS.None }],
  ['iac', { opcode: 0xF2, operandsGroup: OPERANDS_GROUPS.None }],
  ['dac', { opcode: 0xF8, operandsGroup: OPERANDS_GROUPS.None }],
  ['ral', { opcode: 0xF5, operandsGroup: OPERANDS_GROUPS.None }],
  ['rar', { opcode: 0xF6, operandsGroup: OPERANDS_GROUPS.None }],
  ['tcc', { opcode: 0xF7, operandsGroup: OPERANDS_GROUPS.None }],
  ['daa', { opcode: 0xFB, operandsGroup: OPERANDS_GROUPS.None }],
  ['tcs', { opcode: 0xF9, operandsGroup: OPERANDS_GROUPS.None }],
  ['kbp', { opcode: 0xFC, operandsGroup: OPERANDS_GROUPS.None }],
  ['dcl', { opcode: 0xFD, operandsGroup: OPERANDS_GROUPS.None }],
  ['hlt', { opcode: 0x01, operandsGroup: OPERANDS_GROUPS.None }],
  ['bbs', { opcode: 0x02, operandsGroup: OPERANDS_GROUPS.None }],
  ['lcr', { opcode: 0x03, operandsGroup: OPERANDS_GROUPS.None }],
  ['or4', { opcode: 0x04, operandsGroup: OPERANDS_GROUPS.None }],
  ['or5', { opcode: 0x05, operandsGroup: OPERANDS_GROUPS.None }],
  ['an6', { opcode: 0x06, operandsGroup: OPERANDS_GROUPS.None }],
  ['an7', { opcode: 0x07, operandsGroup: OPERANDS_GROUPS.None }],
  ['db0', { opcode: 0x08, operandsGroup: OPERANDS_GROUPS.None }],
  ['db1', { opcode: 0x09, operandsGroup: OPERANDS_GROUPS.None }],
  ['sb0', { opcode: 0x0A, operandsGroup: OPERANDS_GROUPS.None }],
  ['sb1', { opcode: 0x0B, operandsGroup: OPERANDS_GROUPS.None }],
  ['ein', { opcode: 0x0C, operandsGroup: OPERANDS_GROUPS.None }],
  ['din', { opcode: 0x0D, operandsGroup: OPERANDS_GROUPS.None }],
  ['rpm', { opcode: 0x0E, operandsGroup: OPERANDS_GROUPS.None }],
  ['ld', { opcode: 0xA0, operandsGroup: OPERANDS_GROUPS.Register }],
  ['xch', { opcode: 0xB0, operandsGroup: OPERANDS_GROUPS.Register }],
  ['add', { opcode: 0x80, operandsGroup: OPERANDS_GROUPS.Register }],
  ['sub', { opcode: 0x90, operandsGroup: OPERANDS_GROUPS.Register }],
  ['inc', { opcode: 0x60, operandsGroup: OPERANDS_GROUPS.Register }],
  ['src', { opcode: 0x21, operandsGroup: OPERANDS_GROUPS.RegisterPair }],
  ['fin', { opcode: 0x30, operandsGroup: OPERANDS_GROUPS.RegisterPair }],
  ['jin', { opcode: 0x31, operandsGroup: OPERANDS_GROUPS.RegisterPair }],
  ['bbl', { opcode: 0xC0, operandsGroup: OPERANDS_GROUPS.Immediate4bit }],
  ['ldm', { opcode: 0xD0, operandsGroup: OPERANDS_GROUPS.Immediate4bit }],
  ['fim', { opcode: 0x20, operandsGroup: OPERANDS_GROUPS.RegisterPairAndImmediate8bit }],
  ['jms', { opcode: 0x50, operandsGroup: OPERANDS_GROUPS.Immediate12bit }],
  ['jun', { opcode: 0x40, operandsGroup: OPERANDS_GROUPS.Immediate12bit }],
  ['isz', { opcode: 0x70, operandsGroup: OPERANDS_GROUPS.RegisterAndImmediate8bit }],
  ['jcn', { opcode: 0x10, operandsGroup: OPERANDS_GROUPS.CondAndImmediate8bit }],
]);

const convertRegistryToOpModifier = (reg) => Number(reg.substring(2));

const convertRegistryPairToOpModifier = (regPair) => Number(regPair.substring(1)) << 1;

const convertConditionToOpModifier = (cond) => {
  const condParts = cond.split('');

  return (
    (condParts.includes('n') ? 8 : 0)
    | (condParts.includes('z') ? 4 : 0)
    | (condParts.includes('c') ? 2 : 0)
    | (condParts.includes('t') ? 1 : 0)
  );
};

const assemblyInstruction = (instruction, operand1, operand2) => {
  const { opcode, operandsGroup } = INSTRUCTIONS.get(instruction);

  switch (operandsGroup) {
    case OPERANDS_GROUPS.None:
      return [opcode];
    case OPERANDS_GROUPS.Register:
      return [opcode | convertRegistryToOpModifier(operand1)];
    case OPERANDS_GROUPS.RegisterPair:
      return [opcode | convertRegistryPairToOpModifier(operand1)];
    case OPERANDS_GROUPS.Immediate4bit:
      return [opcode | operand1];
    case OPERANDS_GROUPS.RegisterPairAndImmediate8bit:
      return [opcode | convertRegistryPairToOpModifier(operand1), operand2];
    case OPERANDS_GROUPS.Immediate12bit:
      return [opcode | (operand1 >> 8), operand1 & 0xFF];
    case OPERANDS_GROUPS.RegisterAndImmediate8bit:
      return [opcode | convertRegistryToOpModifier(operand1), operand2];
    case OPERANDS_GROUPS.CondAndImmediate8bit:
      return [opcode | convertConditionToOpModifier(operand1), operand2];
    default:
      throw Error('Unknown instruction!');
  }
};

module.exports = {
  assemblyInstruction,
};
