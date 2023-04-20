import { numToHWNumber } from '#utilities/numbers.js';
import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';

import {
  generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization, generateMemoryMainCharactersInitialization,
} from '#utilities/codeGenerator.js';

const getModulusSizeMarker = (m) => {
  if (m > 0x1000) {
    return 0;
  }

  return m > 0x100 ? 0xF : 0x1;
};

export function putModulusBasedDataIntoMemory(memory, m) {
  // modulus and inverted modulus
  writeValueToStatusChars(numToHWNumber(m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS);
  writeValueToStatusChars(numToHWNumber(0x10000 - m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV);

  // first lookup table for 4-word numbers
  for (let digit = 0; digit <= 0xF; digit++) {
    const multiplier = Math.floor((digit * 0x1000) / m);
    writeValueToStatusChars(numToHWNumber(0x10000 - (multiplier * m)), memory, digit, 0);
  }

  // second lookup table for 3-word numbers
  for (let digit = 0; digit <= 0xF; digit++) {
    const multiple = Math.floor((digit * 0x100) / m) * m;
    const multipleHW = numToHWNumber(0x10000 - multiple);
    const regOffset = Math.trunc(digit / 4);
    const charOffset = digit % 4;
    memory[7].registers[0x8 + regOffset].main[charOffset * 4] = (multiple === 0x0) ? 0x1 : 0x0;
    memory[7].registers[0x8 + regOffset].main[charOffset * 4 + 1] = multipleHW[0] || 0x0;
    memory[7].registers[0x8 + regOffset].main[charOffset * 4 + 2] = multipleHW[1] || 0x0;
    memory[7].registers[0x8 + regOffset].main[charOffset * 4 + 3] = multipleHW[2] || 0x0;
  }

  // flag, that represents size of modulus
  memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV].main[0] = getModulusSizeMarker(m);
}

export function generateCodeToPrepareModulusBasedDataForEmulator(m) {
  // first lookup table for 4-word numbers
  const LUT16 = Array(0x10);
  for (let digit = 0x0; digit <= 0xF; digit++) {
    LUT16[digit] = 0x10000 - (Math.floor((digit * 0x1000) / m) * m);
  }

  // second lookup table for 3-word numbers
  const LUT12 = Array.from(Array(4), () => []);
  for (let digit = 0; digit <= 0xF; digit++) {
    const multiple = Math.floor((digit * 0x100) / m) * m;
    const multipleHW = numToHWNumber(0x10000 - multiple);
    const regOffset = Math.trunc(digit / 4);
    const charOffset = digit % 4;
    LUT12[regOffset][charOffset * 4] = (multiple === 0x0) ? 0x1 : 0x0;
    LUT12[regOffset][charOffset * 4 + 1] = multipleHW[0] || 0x0;
    LUT12[regOffset][charOffset * 4 + 2] = multipleHW[1] || 0x0;
    LUT12[regOffset][charOffset * 4 + 3] = multipleHW[2] || 0x0;
  }

  return [
    generateMemoryBankSwitch(0x0),
    ...(LUT16.map((multiple, regNo) => generateMemoryStatusCharactersInitialization(regNo, numToHWNumber(multiple)))),
    generateMemoryBankSwitch(0x7),
    ...(LUT12.map((data, regOffset) => generateMemoryMainCharactersInitialization(0x8 + regOffset, data))),
    generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_MODULUS, numToHWNumber(m)),
    generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV, numToHWNumber(0x10000 - m)),
    generateMemoryMainCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV, [getModulusSizeMarker(m)]),
  ];
}
