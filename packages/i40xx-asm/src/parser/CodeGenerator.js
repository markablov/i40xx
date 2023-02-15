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

  // process hex and decimal values
  static #byteFromNumeric(data) {
    return data.startsWith('0x') ? parseInt(data.substring(2), 16) : Number(data);
  }

  // addr could be label name or 12-bit number (0 <= addr <= 4095) or "page:offset" string,
  // where "page" is 4-bit page number and "offset" is 8-bit offset for specific page
  #getAddrCode = (addr, type, instructionIdx) => {
    switch (type) {
      case AddrType.FlatAddress:
        return CodeGenerator.#byteFromNumeric(addr);

      case AddrType.ROMAddress: {
        const [page, offset] = addr.split(':').map((numeric) => CodeGenerator.#byteFromNumeric(numeric));
        return (page << 8) | offset;
      }

      case AddrType.Label:
        this.#referencesByLabel.push({ referencedLabel: addr, instructionIdx });
        return 0x0;

      default:
        return 0x0;
    }
  };

  addFixedLocation(addressStr) {
    const [page, offset] = addressStr.split(':').map((numeric) => CodeGenerator.#byteFromNumeric(numeric));
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

  // data is 4-bit number, 0 <= data <= 15
  pushInstructionWithData4(instruction, data, line) {
    const dataValue = CodeGenerator.#byteFromNumeric(data);
    if (dataValue > 0xF) {
      throw new Error('Argument is too big, should be 0xF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, dataValue),
      type: instruction === 'bbl' ? INSTRUCTION_TYPES.Return : INSTRUCTION_TYPES.Regular,
      refInstructionIdx: null,
      sourceCodeLine: line,
    });
  }

  // data is 8-bit number, 0 <= data <= 255, regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPairAndData8(instruction, regPair, data, line) {
    const dataValue = CodeGenerator.#byteFromNumeric(data);
    if (dataValue > 0xFF) {
      throw new Error('Argument is too big, should be 0xFF or less');
    }

    this.#instructions.push({
      opcode: assemblyInstruction(instruction, regPair, dataValue),
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
      symbols: [...this.#labelToInstructionMap.entries()].map(([label, instructionIdx]) => ({ label, instructionIdx })),
    };
  }

  clear() {
    this.#instructions = [];
    this.#labelToInstructionMap = new Map();
    this.#referencesByLabel = [];
    this.#fixedLocations = [];
  }
}

module.exports = {
  CodeGenerator,
  AddrType,
};
