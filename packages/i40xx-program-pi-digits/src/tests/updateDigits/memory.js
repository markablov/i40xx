import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';

import {
  VARIABLES, writeValueToMainChars, writeValueToStatusChars, getMemoryBankFromAbsoluteAddr,
} from '#utilities/memory.js';

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
