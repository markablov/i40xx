const InstructionsWithoutArgCodes = {
  nop: 0x00,
  rdm: 0xE9,
  rd0: 0xEC,
  rd1: 0xED,
  rd2: 0xEE,
  rd3: 0xEF,
  rdr: 0xEA,
  wrm: 0xE0,
  wr0: 0xE4,
  wr1: 0xE5,
  wr2: 0xE6,
  wr3: 0xE7,
  wrr: 0xE2,
  wmp: 0xE1,
  wpm: 0xE3,
  adm: 0xEB,
  sbm: 0xE8,
  clb: 0xF0,
  clc: 0xF1,
  cmc: 0xF3,
  stc: 0xFA,
  cma: 0xF4,
  iac: 0xF2,
  dac: 0xF8,
  ral: 0xF5,
  rar: 0xF6,
  tcc: 0xF7,
  daa: 0xFB,
  tcs: 0xF9,
  kbp: 0xFC,
  dcl: 0xFD
};

class CodeGenerator {
  // we limited by 4k ram, so array is performant enough in comparison with buffer
  bin = [];

  pushInstructionWithoutArg(instruction){
    this.bin.push(InstructionsWithoutArgCodes[instruction]);
  }

  generate() {
  }
}

export default CodeGenerator;
