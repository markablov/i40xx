import { numToHWNumber } from '#utilities/numbers.js';
import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization } from '#utilities/codeGenerator.js';

export function putModulusBasedDataIntoMemory(memory, m) {
  // modulus and inverted modulus
  writeValueToStatusChars(numToHWNumber(m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS);
  writeValueToStatusChars(numToHWNumber(0x10000 - m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_NEG);

  // first lookup table for 4-word numbers
  for (let digit = 1; digit <= 0xF; digit++) {
    const multiplier = Math.floor((digit * 0x1000) / m);
    writeValueToStatusChars(numToHWNumber(0x10000 - (multiplier * m)), memory, digit, 0);
  }

  // pre-computed value for a bit finer adjust for small modulus
  const maxSafeModulusMultipleFor12Bit = m > 0x1000 ? [] : numToHWNumber(0x1000 - (Math.floor(0xF00 / m) || 1) * m, 3);
  writeValueToStatusChars([m > 0x1000 ? 0x0 : 0x1, ...maxSafeModulusMultipleFor12Bit], memory, 0, 0);
}

export function generateCodeToPrepareModulusBasedDataForEmulator(m) {
  // first lookup table for 4-word numbers
  const LUT16 = Array(0x10);
  for (let digit = 0x0; digit <= 0xF; digit++) {
    LUT16[digit] = 0x10000 - (Math.floor((digit * 0x1000) / m) * m);
  }

  const maxSafeModulusMultipleFor12Bit = m > 0x1000 ? [] : numToHWNumber(0x1000 - (Math.floor(0xF00 / m) || 1) * m, 3);
  return [
    generateMemoryBankSwitch(0x0),
    ...(LUT16.map((multiple, regNo) => generateMemoryStatusCharactersInitialization(regNo, numToHWNumber(multiple)))),
    generateMemoryStatusCharactersInitialization(0, [m > 0x1000 ? 0x0 : 0x1, ...maxSafeModulusMultipleFor12Bit]),
    generateMemoryBankSwitch(0x7),
    generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_MODULUS, numToHWNumber(m)),
    generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_MODULUS_NEG, numToHWNumber(0x10000 - m)),
  ];
}
