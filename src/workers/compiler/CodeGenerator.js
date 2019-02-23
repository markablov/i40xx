const InstructionsWithoutArgCodes = {
  nop: 0x00, rdm: 0xE9, rd0: 0xEC, rd1: 0xED, rd2: 0xEE, rd3: 0xEF, rdr: 0xEA, wrm: 0xE0, wr0: 0xE4, wr1: 0xE5,
  wr2: 0xE6, wr3: 0xE7, wrr: 0xE2, wmp: 0xE1, wpm: 0xE3, adm: 0xEB, sbm: 0xE8, clb: 0xF0, clc: 0xF1, cmc: 0xF3,
  stc: 0xFA, cma: 0xF4, iac: 0xF2, dac: 0xF8, ral: 0xF5, rar: 0xF6, tcc: 0xF7, daa: 0xFB, tcs: 0xF9, kbp: 0xFC,
  dcl: 0xFD
};

const InstructionsWithReg = { ld: 0xA0, xch: 0xB0, add: 0x80, sub: 0x90, inc: 0x60 };

const InstructionsWithRegPair = { src: 0x21, fin: 0x30, jin: 0x31 };

const ROM_SIZE = 4096;

class CodeGenerator {
  bin = new Uint8Array(ROM_SIZE);
  current = 0;

  getRegCode = reg => +reg.substr(2);

  getRegPairCode = regPair => +regPair.substr(1);

  pushInstructionWithoutArg(instruction){
    this.bin[this.current] = InstructionsWithoutArgCodes[instruction];
    this.current++;
  }

  pushInstructionWithReg(instruction, reg) {
    // format is [O O O O R R R R], where OOOO is opcode, and RRRR is reg index
    // opcode from table is already with nullified bits [0..3], so don't need to perform bitwise AND
    this.bin[this.current] = InstructionsWithReg[instruction] | this.getRegCode(reg);
    this.current++;
  }

  pushInstructionWithRegPair(instruction, regPair) {
    // format is [O O O O R R R O], where OOOOO is opcode, and RRR is reg pair index
    // opcode from table is already with nullified bits [1..3], so don't need to perform bitwise AND
    this.bin[this.current] = InstructionsWithRegPair[instruction] | (this.getRegPairCode(regPair) << 1);
    this.current++;
  }

  generate() {
    return this.bin;
  }
}

export default CodeGenerator;
