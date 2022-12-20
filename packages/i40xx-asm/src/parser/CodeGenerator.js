const AddrType = {
  Label: Symbol('Label'),
  FlatAddress: Symbol('FlatAddress'),
  BankAddress: Symbol('BankAddress'),
};

const InstructionsWithoutArgCodes = new Map([
  ['nop', 0x00], ['rdm', 0xE9], ['rd0', 0xEC], ['rd1', 0xED], ['rd2', 0xEE], ['rd3', 0xEF], ['rdr', 0xEA],
  ['wrm', 0xE0], ['wr0', 0xE4], ['wr1', 0xE5], ['wr2', 0xE6], ['wr3', 0xE7], ['wrr', 0xE2], ['wmp', 0xE1],
  ['wpm', 0xE3], ['adm', 0xEB], ['sbm', 0xE8], ['clb', 0xF0], ['clc', 0xF1], ['cmc', 0xF3], ['stc', 0xFA],
  ['cma', 0xF4], ['iac', 0xF2], ['dac', 0xF8], ['ral', 0xF5], ['rar', 0xF6], ['tcc', 0xF7], ['daa', 0xFB],
  ['tcs', 0xF9], ['kbp', 0xFC], ['dcl', 0xFD], ['hlt', 0x01], ['bbs', 0x02], ['lcr', 0x03], ['or4', 0x04],
  ['or5', 0x05], ['an6', 0x06], ['an7', 0x07], ['db0', 0x08], ['db1', 0x09], ['sb0', 0x0A], ['sb1', 0x0B],
  ['ein', 0x0C], ['din', 0x0D], ['rpm', 0x0E],
]);

// opcodes in this tables are already with placeholder 0 bits to keep encoded argument
// it allows to skip bitwise AND before bitwise OR with encoded argument on instruction generation
const InstructionsWithReg = new Map([['ld', 0xA0], ['xch', 0xB0], ['add', 0x80], ['sub', 0x90], ['inc', 0x60]]);
const InstructionsWithRegPair = new Map([['src', 0x21], ['fin', 0x30], ['jin', 0x31]]);
const InstructionsWithData4 = new Map([['bbl', 0xC0], ['ldm', 0xD0]]);
const InstructionsWithRegPairAndData8 = new Map([['fim', 0x20]]);
const InstructionsWithAddr12 = new Map([['jms', 0x50], ['jun', 0x40]]);
const InstructionsWithRegAndAddr8 = new Map([['isz', 0x70]]);
const InstructionsWithCondAndAddr8 = new Map([['jcn', 0x10]]);

const ROM_SIZE = 4096;

class CodeGenerator {
  #bin = new Uint8Array(ROM_SIZE);

  #labels = {};

  #offsetsToLabel = {};

  #current = 0;

  static #byteFromRegistry(reg) {
    return +reg.substr(2);
  }

  static #byteFromRegistryPair(regPair) {
    return (+regPair.substr(1)) << 1;
  }

  // process hex and decimal values
  static #byteFromNumeric(data) {
    return data.startsWith('0x') ? parseInt(data.substr(2), 16) : +data;
  }

  static #byteFromCond(cond) {
    cond = cond.split('');
    return (cond.includes('n') ? 8 : 0) | (cond.includes('z') ? 4 : 0) | (cond.includes('c') ? 2 : 0) | (cond.includes('t') ? 1 : 0);
  }

  // addr could be label name or 12-bit number (0 <= addr <= 4095) or "bank:offset" string,
  // where "bank" is 4-bit bank number and "offset" is 8-bit offset for specific bank
  getAddrCode = (addr, type, short) => {
    let addrValue = 0;
    const currentBank = this.#current >> 8;

    switch (type) {
      case AddrType.FlatAddress:
        addrValue = CodeGenerator.#byteFromNumeric(addr);
        if (short && (addrValue >> 8) !== currentBank) {
          throw new Error('For short jumps, address should be in the same bank as instruction');
        }
        break;
      case AddrType.BankAddress: {
        const [bank, offset] = addr.split(':').map((numeric) => CodeGenerator.#byteFromNumeric(numeric));
        if (short && bank !== currentBank) {
          throw new Error('For short jumps, address should be in the same bank as instruction');
        }
        addrValue = (bank << 8) | offset;
        break;
      }
      case AddrType.Label:
        this.#offsetsToLabel[this.#current] = { label: addr, short };
        break;
      default:
        break;
    }

    return addrValue;
  };

  addLabel(label) {
    if (this.#labels[label] !== undefined) {
      return false;
    }

    this.#labels[label] = this.#current;
    return true;
  }

  pushInstructionWithoutArg(instruction) {
    this.#bin[this.#current++] = InstructionsWithoutArgCodes.get(instruction);
  }

  // reg is "rrX" string, where 0 <= X <= 15
  pushInstructionWithReg(instruction, reg) {
    // format is [O O O O R R R R], where OOOO is opcode, and RRRR is reg index
    const OPR = InstructionsWithReg.get(instruction);
    this.#bin[this.#current++] = OPR | CodeGenerator.#byteFromRegistry(reg);
  }

  // regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPair(instruction, regPair) {
    // format is [O O O O R R R O], where OOOOO is opcode, and RRR is reg pair index
    const OPR = InstructionsWithRegPair.get(instruction);
    this.#bin[this.#current++] = OPR | CodeGenerator.#byteFromRegistryPair(regPair);
  }

  // data is 4-bit number, 0 <= data <= 15
  pushInstructionWithData4(instruction, data) {
    const dataValue = CodeGenerator.#byteFromNumeric(data);
    if (dataValue > 0xF) {
      throw new Error('Argument is too big, should be 0xF or less');
    }

    // format is [O O O O D D D D], where OOOO is opcode, and DDDD is 4-bit number
    const OPR = InstructionsWithData4.get(instruction);
    this.#bin[this.#current++] = OPR | dataValue;
  }

  // data is 8-bit number, 0 <= data <= 255, regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPairAndData8(instruction, regPair, data) {
    const dataValue = CodeGenerator.#byteFromNumeric(data);
    if (dataValue > 0xFF) {
      throw new Error('Argument is too big, should be 0xFF or less');
    }

    // format is [O O O O R R R O] [D D D D D D D D], where OOOOO is opcode,
    // RRR is reg pair index, and DDDDDDDD is 8-bit number
    const OPR = InstructionsWithRegPairAndData8.get(instruction);
    this.#bin[this.#current++] = OPR | CodeGenerator.#byteFromRegistryPair(regPair);
    this.#bin[this.#current++] = dataValue;
  }

  pushInstructionWithAddr12(instruction, addr, type) {
    const addrValue = this.getAddrCode(addr, type, false);
    // format is [O O O O A A A A] [A A A A A A A A], where OOOOO is opcode, AAAAAAAAAAAA is 12-bit address
    const OPR = InstructionsWithAddr12.get(instruction);
    this.#bin[this.#current++] = OPR | (addrValue >> 8);
    this.#bin[this.#current++] = addrValue & 0xFF;
  }

  pushInstructionWithRegAndAddr8(instruction, reg, addr, type) {
    if (instruction === 'isz' && (this.#current & 0xFF) === 0xFE) {
      throw new Error('Conditional jump never happens if instruction would be located at xx:0xFE address');
    }

    const addrValue = this.getAddrCode(addr, type, true);
    // format is [O O O O R R R R] [A A A A A A A A], where OOOOO is opcode
    // RRRR is reg index, and AAAAAAAA is 8-bit address
    const OPR = InstructionsWithRegAndAddr8.get(instruction);
    this.#bin[this.#current++] = OPR | CodeGenerator.#byteFromRegistry(reg);
    this.#bin[this.#current++] = addrValue & 0xFF;
  }

  pushInstructionWithCondAndAddr8(instruction, cond, addr, type) {
    if ((this.#current & 0xFF) === 0xFE) {
      throw new Error('Conditional jump never happens if instruction would be located at xx:0xFE address');
    }

    const addrValue = this.getAddrCode(addr, type, true);
    // format is [O O O O C C C C] [A A A A A A A A], where OOOOO is opcode
    // CCCC is condition, and AAAAAAAA is 8-bit address
    const OPR = InstructionsWithCondAndAddr8.get(instruction);
    this.#bin[this.#current++] = OPR | (CodeGenerator.#byteFromCond(cond));
    this.#bin[this.#current++] = addrValue & 0xFF;
  }

  generate() {
    // on this stage we have information about all labels, so we can fill all offsets
    for (const [offset, { label, short }] of Object.entries(this.#offsetsToLabel).map(([k, v]) => ([+k, v]))) {
      const addr = this.#labels[label];
      if (addr === undefined) {
        throw new Error(`Unknown label ${label}`);
      }

      if (short) {
        if ((addr >> 8) !== (offset >> 8)) {
          const err = new Error('For short jumps, address should be in the same bank as instruction');
          err.labelName = label;
          throw err;
        }
        this.#bin[offset + 1] = addr & 0xFF;
      } else {
        this.#bin[offset] |= addr >> 8;
        this.#bin[offset + 1] = addr & 0xFF;
      }
    }

    return this.#bin.subarray(0, this.#current);
  }

  clear() {
    this.#bin = new Uint8Array(ROM_SIZE);
    this.#current = 0;
    this.#labels = {};
    this.#offsetsToLabel = {};
  }
}

module.exports = {
  CodeGenerator,
  AddrType,
};
