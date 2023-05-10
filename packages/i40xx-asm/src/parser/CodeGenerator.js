const { INSTRUCTION_TYPES } = require('../const');
const { assemblyInstruction } = require('./assembly.js');

const AddrType = {
  Label: Symbol('Label'),
  FlatAddress: Symbol('FlatAddress'),
  ROMAddress: Symbol('ROMAddress'),
};

class CodeGenerator {
  #instructions = [];

  #labelToInstructionMap = new Map();

  #referencesByLabel = [];

  #fixedLocations = [];

  #fixedRomBanks = [];

  // process hex and decimal values
  static #immToNumber(imm) {
    return imm.startsWith('0x') ? parseInt(imm.substring(2), 16) : Number(imm);
  }

  // addr could be label name or 12-bit number (0 <= addr <= 4095) or "page:offset" string,
  // where "page" is 4-bit page number and "offset" is 8-bit offset for specific page
  #getAddrCode = (addr, type, instructionIdx) => {
    switch (type) {
      case AddrType.FlatAddress:
        return CodeGenerator.#immToNumber(addr);

      case AddrType.ROMAddress: {
        const [page, offset] = addr.split(':').map((numeric) => CodeGenerator.#immToNumber(numeric));
        return (page << 8) | offset;
      }

      case AddrType.Label:
        this.#referencesByLabel.push({ referencedLabel: addr, instructionIdx });
        return 0x0;

      default:
        return 0x0;
    }
  };

  setBankNumber(bankNoStr) {
    const bankNo = CodeGenerator.#immToNumber(bankNoStr);
    if (bankNo !== 0 && bankNo !== 1) {
      throw new Error('Incorrect bank index, should be 0 or 1');
    }

    this.#fixedRomBanks.push({ instructionIdx: this.#instructions.length, bankNo });
  }

  addFixedLocation(addressStr) {
    const [page, offset] = addressStr.split(':').map((numeric) => CodeGenerator.#immToNumber(numeric));
    this.#fixedLocations.push({ instructionIdx: this.#instructions.length, romPage: page, romOffset: offset });
  }

  addLabel(label) {
    if (this.#labelToInstructionMap.has(label)) {
      return false;
    }

    this.#labelToInstructionMap.set(label, this.#instructions.length);
    return true;
  }

  pushInstructionWithoutArg(instruction, line) {
    this.#instructions.push({
      opcode: assemblyInstruction(instruction),
      type: instruction === 'hlt' ? INSTRUCTION_TYPES.Halt : INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  // reg is "rrX" string, where 0 <= X <= 15
  pushInstructionWithReg(instruction, reg, line) {
    this.#instructions.push({
      opcode: assemblyInstruction(instruction, reg),
      type: INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  // regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPair(instruction, regPair, line) {
    this.#instructions.push({
      opcode: assemblyInstruction(instruction, regPair),
      type: instruction === 'jin' ? INSTRUCTION_TYPES.FarJump : INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  // imm is 4-bit number, 0 <= imm <= 15
  pushInstructionWithImm4(instruction, imm, line) {
    const immValue = CodeGenerator.#immToNumber(imm);
    if (immValue > 0xF) {
      throw new Error('Argument is too big, should be 0xF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, immValue),
      type: instruction === 'bbl' ? INSTRUCTION_TYPES.Return : INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  // imm is 8-bit number, 0 <= imm <= 255, regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPairAndImm8(instruction, regPair, imm, line) {
    const immValue = CodeGenerator.#immToNumber(imm);
    if (immValue > 0xFF) {
      throw new Error('Argument is too big, should be 0xFF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, regPair, immValue),
      type: INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  instructionWithFarAddr(instruction, addr, type, line) {
    const addrValue = this.#getAddrCode(addr, type, this.#instructions.length);
    this.#instructions.push({
      opcode: assemblyInstruction(instruction, addrValue),
      type: instruction === 'jun' ? INSTRUCTION_TYPES.FarJump : INSTRUCTION_TYPES.Call,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  pushISZInstruction(instruction, reg, addr, type, line) {
    const addrValue = this.#getAddrCode(addr, type, this.#instructions.length);
    if (addrValue > 0xFF) {
      throw new Error('Argument is too big, should be 0xFF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, reg, addrValue),
      type: INSTRUCTION_TYPES.JumpConditional,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  pushJCNInstruction(instruction, cond, addr, type, line) {
    const addrValue = this.#getAddrCode(addr, type, this.#instructions.length);
    if (addrValue > 0xFF) {
      throw new Error('Argument is too big, should be 0xFF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, cond, addrValue),
      type: INSTRUCTION_TYPES.JumpConditional,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  generate() {
    // on this stage we have information about all labels, so we can fill all references to actual instructions
    for (const { referencedLabel, instructionIdx } of this.#referencesByLabel) {
      const refInstructionIdx = this.#labelToInstructionMap.get(referencedLabel);
      if (refInstructionIdx === undefined) {
        throw new Error(`Unknown label ${referencedLabel}`);
      }

      this.#instructions[instructionIdx].refInstructionIdx = refInstructionIdx;
    }

    return {
      instructions: this.#instructions,
      fixedLocations: this.#fixedLocations,
      fixedRomBanks: this.#fixedRomBanks,
      symbols: [...this.#labelToInstructionMap.entries()].map(([label, instructionIdx]) => ({ label, instructionIdx })),
    };
  }

  clear() {
    this.#instructions = [];
    this.#labelToInstructionMap = new Map();
    this.#referencesByLabel = [];
    this.#fixedLocations = [];
    this.#fixedRomBanks = [];
  }
}

module.exports = {
  CodeGenerator,
  AddrType,
};
