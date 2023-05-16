import { VARIABLES, writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';

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
  const { chunks, startingPiDigitsPosition, a, N } = input;
  const startingDigitsPositionHW = hexToHWNumber(startingPiDigitsPosition);
  const numN = parseInt(N, 16);

  writeValueToStatusChars(numToHWNumber(0x100 - chunks.length), memory, VARIABLES.STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG);
  writeValueToStatusChars(startingDigitsPositionHW, memory, VARIABLES.STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION);
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(numToHWNumber(0x10000 - (numN + 1)), memory, VARIABLES.STATUS_MEM_VARIABLE_N_NEG);
  writeValueToStatusChars(numToHWNumber(0x10000 - (2 * numN)), memory, VARIABLES.STATUS_MEM_VARIABLE_DOUBLED_N_NEG);

  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
}
