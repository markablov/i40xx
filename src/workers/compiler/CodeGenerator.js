export const AddrType = {
  Label: Symbol('Label'),
  FlatAddress: Symbol('FlatAddress'),
  BankAddress: Symbol('BankAddress')
};

const InstructionsWithoutArgCodes = {
  nop: 0x00, rdm: 0xE9, rd0: 0xEC, rd1: 0xED, rd2: 0xEE, rd3: 0xEF, rdr: 0xEA, wrm: 0xE0, wr0: 0xE4, wr1: 0xE5,
  wr2: 0xE6, wr3: 0xE7, wrr: 0xE2, wmp: 0xE1, wpm: 0xE3, adm: 0xEB, sbm: 0xE8, clb: 0xF0, clc: 0xF1, cmc: 0xF3,
  stc: 0xFA, cma: 0xF4, iac: 0xF2, dac: 0xF8, ral: 0xF5, rar: 0xF6, tcc: 0xF7, daa: 0xFB, tcs: 0xF9, kbp: 0xFC,
  dcl: 0xFD
};

// opcodes in this tables are already with placeholder 0 bits to keep encoded argument
// it allows to skip bitwise AND before bitwise OR with encoded argument on instruction generation
const InstructionsWithReg = { ld: 0xA0, xch: 0xB0, add: 0x80, sub: 0x90, inc: 0x60 };
const InstructionsWithRegPair = { src: 0x21, fin: 0x30, jin: 0x31 };
const InstructionsWithData4 = { bbl: 0xC0, ldm: 0xD0 };
const InstructionsWithRegPairAndData8 = { fim: 0x20 };
const InstructionsWithAddr12 = { jms: 0x40, jun: 0x50 };

const ROM_SIZE = 4096;

class CodeGenerator {
  bin = new Uint8Array(ROM_SIZE);
  labels = {};
  offsetsToLabel = {};
  current = 0;

  getRegCode = reg => +reg.substr(2);

  getRegPairCode = regPair => +regPair.substr(1);

  getDataCode = data => data.startsWith('0x') ? parseInt(data.substr(2), 16) : +data;

  getAddrCode = (addr, type) => {
    let addrValue = 0;

    switch (type) {
      case AddrType.FlatAddress:
        addrValue = this.getDataCode(addr);
        if (addrValue > 0xFFF)
          throw new Error('Argument is too big, should be 0xFFF or less');
        break;
      case AddrType.BankAddress: {
        const [bank, offset] = addr.split(':');
        if (bank > 0xF)
          throw new Error('Bank number is too big, should be 0xF or less');
        if (offset > 0xFF)
          throw new Error('Bank offset is too big, should be 0xFF or less');
        addrValue = (bank << 8) | offset;
        break;
      }
      case AddrType.Label:
        this.offsetsToLabel[this.current] = addr;
        break;
    }

    return addrValue;
  };

  addLabel(label){
    if (this.labels[label])
      return false;

    this.labels[label] = this.current;
    return true;
  }

  pushInstructionWithoutArg(instruction){
    this.bin[this.current++] = InstructionsWithoutArgCodes[instruction];
  }

  // reg is "rrX" string, where 0 <= X <= 15
  pushInstructionWithReg(instruction, reg) {
    // format is [O O O O R R R R], where OOOO is opcode, and RRRR is reg index
    this.bin[this.current++] = InstructionsWithReg[instruction] | this.getRegCode(reg);
  }

  // regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPair(instruction, regPair) {
    // format is [O O O O R R R O], where OOOOO is opcode, and RRR is reg pair index
    this.bin[this.current++] = InstructionsWithRegPair[instruction] | (this.getRegPairCode(regPair) << 1);
  }

  // data is 4-bit number, 0 <= data <= 15
  pushInstructionWithData4(instruction, data) {
    const dataValue = this.getDataCode(data);
    if (dataValue > 0xF)
      throw new Error('Argument is too big, should be 0xF or less');

    // format is [O O O O D D D D], where OOOO is opcode, and DDDD is 4-bit number
    this.bin[this.current++] = InstructionsWithData4[instruction] | dataValue;
  }

  // data is 8-bit number, 0 <= data <= 255, regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPairAndData8(instruction, regPair, data) {
    const dataValue = this.getDataCode(data);
    if (dataValue > 0xFF)
      throw new Error('Argument is too big, should be 0xFF or less');

    // format is [O O O O R R R O] [D D D D D D D D], where OOOOO is opcode,
    // RRR is reg pair index, and DDDDDDDD is 8-bit number
    this.bin[this.current++] = InstructionsWithRegPairAndData8[instruction] | (this.getRegPairCode(regPair) << 1);
    this.bin[this.current++] = dataValue;
  }

  // addr could be label name or 12-bit number (0 <= addr <= 4095) or "bank:offset" string,
  // where "bank" is 4-bit bank number and "offset" is 8-bit offset for specific bank
  pushInstructionWithAddr12(instruction, addr, type) {
    const addrValue = this.getAddrCode(addr, type);
    // format is [O O O O A A A A] [A A A A A A A A], where OOOOO is opcode, AAAAAAAAAAAA is 12-bit address
    this.bin[this.current++] = InstructionsWithAddr12[instruction] | (addrValue >> 8);
    this.bin[this.current++] = addrValue & 0xFF;
  }

  generate() {
    // on this stage we have information about all labels, so we can fill all offsets
    for (const [offset, label] of Object.entries(this.offsetsToLabel)) {
      const addr = this.labels[label];
      if (addr === undefined)
        throw new Error(`Unknown label ${label}`);
      // offset is string key, need to convert to integer
      this.bin[+offset] |= addr >> 8;
      this.bin[+offset + 1] = addr & 0xFF;
    }
    return this.bin;
  }

  clear() {
    this.bin = new Uint8Array(ROM_SIZE);
    this.current = 0;
    this.labels = {};
    this.offsetsToLabel = {};
  }
}

export default CodeGenerator;
