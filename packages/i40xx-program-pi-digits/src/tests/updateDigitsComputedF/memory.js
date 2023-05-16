import { VARIABLES, writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

export function getMemoryBankFromAbsoluteAddr(addr) {
  const bankNo = Math.floor(addr / 16);
  // when you are doing DCL 0x3, RAM bank 0x4 is selected and vice versa
  switch (bankNo) {
    case 3:
      return 4;
    case 4:
      return 3;
    default:
      return bankNo;
  }
}

export function initMemoryWithInput(memory, input) {
  const { chunks, startingPiDigitsPosition, f, m } = input;
  const startingDigitsPositionHW = hexToHWNumber(startingPiDigitsPosition);
  const mNum = parseInt(m, 16);

  putModulusBasedDataIntoMemory(memory, mNum);
  writeValueToStatusChars(numToHWNumber(0x100 - chunks.length), memory, VARIABLES.STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG);
  writeValueToStatusChars(startingDigitsPositionHW, memory, VARIABLES.STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION);
  writeValueToStatusChars(hexToHWNumber(f), memory, VARIABLES.STATUS_MEM_VARIABLE_F);
  writeValueToMainChars(numToHWNumber(mNum), memory, VARIABLES.MAIN_MEM_VARIABLE_DIV_DIVISOR);

  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
}
