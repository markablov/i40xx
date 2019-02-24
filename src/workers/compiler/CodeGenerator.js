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

const ROM_SIZE = 4096;

class CodeGenerator {
  bin = new Uint8Array(ROM_SIZE);
  labels = {};
  current = 0;

  getRegCode = reg => +reg.substr(2);

  getRegPairCode = regPair => +regPair.substr(1);

  gatDataCode = data => data.startsWith('0x') ? parseInt(data.substr(2), 16) : +data;

  addLabel(label){
    if (this.labels[label])
      return false;

    this.labels[label] = this.current;
    return true;
  }

  pushInstructionWithoutArg(instruction){
    this.bin[this.current++] = InstructionsWithoutArgCodes[instruction];
    return true;
  }

  // reg is "rrX" string, where 0 <= X <= 15
  pushInstructionWithReg(instruction, reg) {
    // format is [O O O O R R R R], where OOOO is opcode, and RRRR is reg index
    this.bin[this.current++] = InstructionsWithReg[instruction] | this.getRegCode(reg);
    return true;
  }

  // regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPair(instruction, regPair) {
    // format is [O O O O R R R O], where OOOOO is opcode, and RRR is reg pair index
    this.bin[this.current++] = InstructionsWithRegPair[instruction] | (this.getRegPairCode(regPair) << 1);
    return true;
  }

  // data is 4-bit number, 0 <= data <= 15
  pushInstructionWithData4(instruction, data) {
    const dataValue = this.gatDataCode(data);
    if (dataValue > 0xF)
      return false;

    // format is [O O O O D D D D], where OOOO is opcode, and DDDD is 4-bit number
    this.bin[this.current++] = InstructionsWithData4[instruction] | dataValue;
    return true;
  }

  // data is 8-bit number, 0 <= data <= 255, regPair is "rX" string, where 0 <= X <= 7
  pushInstructionWithRegPairAndData8(instruction, regPair, data) {
    const dataValue = this.gatDataCode(data);
    if (dataValue > 0xFF)
      return false;

    // format is [O O O O R R R O] [D D D D D D D D], where OOOOO is opcode,
    // RRR is reg pair index, and DDDDDDDD is 8-bit number
    this.bin[this.current++] = InstructionsWithRegPairAndData8[instruction] | (this.getRegPairCode(regPair) << 1);
    this.bin[this.current++] = dataValue;
    return true;
  }

  generate() {
    return this.bin;
  }

  clear() {
    this.bin = new Uint8Array(ROM_SIZE);
    this.current = 0;
    this.labels = {};
  }
}

export default CodeGenerator;
