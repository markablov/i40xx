/* eslint-disable no-console */

const toHex = (val) => val.toString(16).toUpperCase();

export function dumpState(system) {
  const { memory, registers } = system;
  const { selectedRegisterBank, indexBanks } = registers;

  console.log(`Current register bank = ${selectedRegisterBank}`);
  for (let regNo = 0; regNo <= 0xF; regNo++) {
    console.log(`rr${regNo} =${regNo < 10 ? ' ' : ''} ${toHex(indexBanks[selectedRegisterBank][regNo])}`);
  }

  console.log('');
  for (let bankIdx = 0; bankIdx < 8; bankIdx++) {
    console.log(`Bank #${bankIdx}`);
    for (let regIdx = 0; regIdx < 0x10; regIdx++) {
      let regChars = '';
      for (let charIdx = 0; charIdx < 0x10; charIdx++) {
        regChars += toHex(memory[bankIdx].registers[regIdx].main[charIdx]);
      }
      regChars += '|';
      for (let charIdx = 0; charIdx < 4; charIdx++) {
        regChars += toHex(memory[bankIdx].registers[regIdx].status[charIdx]);
      }
      console.log(regChars);
    }
    console.log('');
  }
}
