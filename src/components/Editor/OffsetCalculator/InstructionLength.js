const instructionLengths = {
  jcn: 2,
  fim: 2,
  jun: 2,
  jms: 2,
  isz: 2,
  nop: 1,
  ldm: 1,
  ld: 1,
  xch: 1,
  add: 1,
  sub: 1,
  inc: 1,
  bbl: 1,
  jin: 1,
  src: 1,
  fin: 1,
  rdm: 1,
  rd0: 1,
  rd1: 1,
  rd2: 1,
  rd3: 1,
  rdr: 1,
  wrm: 1,
  wr0: 1,
  wr1: 1,
  wr2: 1,
  wr3: 1,
  wrr: 1,
  wmp: 1,
  adm: 1,
  sbm: 1,
  clb: 1,
  clc: 1,
  cmc: 1,
  stc: 1,
  cma: 1,
  iac: 1,
  dac: 1,
  ral: 1,
  rar: 1,
  tcc: 1,
  daa: 1,
  tcs: 1,
  kbp: 1,
  dcl: 1
};

export default function (mnemonic){
  const m = mnemonic.match(/^(?:\w+:)?\s*(\w+)(?:\s+|$)/);
  return m ? (instructionLengths[m[1].toLowerCase()] || 0) : 0;
}