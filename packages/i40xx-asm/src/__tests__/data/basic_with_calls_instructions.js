const { INSTRUCTION_TYPES } = require('../../const.js');

module.exports = {
  instructions: [
    { opcode: [0x50, 0x00], refInstructionIdx: 13, sourceCodeLine: 2, type: INSTRUCTION_TYPES.Call },
    { opcode: [0x14, 0x00], refInstructionIdx: 4, sourceCodeLine: 3, type: INSTRUCTION_TYPES.JumpConditional },
    { opcode: [0xD1], refInstructionIdx: null, sourceCodeLine: 4, type: INSTRUCTION_TYPES.Regular },
    { opcode: [0x40, 0x00], refInstructionIdx: 9, sourceCodeLine: 5, type: INSTRUCTION_TYPES.FarJump },
    { opcode: [0x50, 0x00], refInstructionIdx: 14, sourceCodeLine: 7, type: INSTRUCTION_TYPES.Call },
    { opcode: [0x14, 0x00], refInstructionIdx: 8, sourceCodeLine: 8, type: INSTRUCTION_TYPES.JumpConditional },
    { opcode: [0xD2], refInstructionIdx: null, sourceCodeLine: 9, type: INSTRUCTION_TYPES.Regular },
    { opcode: [0x40, 0x00], refInstructionIdx: 9, sourceCodeLine: 10, type: INSTRUCTION_TYPES.FarJump },
    { opcode: [0xD0], refInstructionIdx: null, sourceCodeLine: 12, type: INSTRUCTION_TYPES.Regular },
    { opcode: [0x14, 0x00], refInstructionIdx: 11, sourceCodeLine: 14, type: INSTRUCTION_TYPES.JumpConditional },
    { opcode: [0x50, 0x00], refInstructionIdx: 15, sourceCodeLine: 15, type: INSTRUCTION_TYPES.Call },
    { opcode: [0xB0], refInstructionIdx: null, sourceCodeLine: 17, type: INSTRUCTION_TYPES.Regular },
    { opcode: [0xC0], refInstructionIdx: null, sourceCodeLine: 18, type: INSTRUCTION_TYPES.Return },
    { opcode: [0xC0], refInstructionIdx: null, sourceCodeLine: 21, type: INSTRUCTION_TYPES.Return },
    { opcode: [0xC0], refInstructionIdx: null, sourceCodeLine: 24, type: INSTRUCTION_TYPES.Return },
    { opcode: [0xC0], refInstructionIdx: null, sourceCodeLine: 27, type: INSTRUCTION_TYPES.Return },
  ],
};
