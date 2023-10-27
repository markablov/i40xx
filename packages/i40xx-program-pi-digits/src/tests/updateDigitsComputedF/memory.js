import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

import {
  VARIABLES, writeValueToMainChars, writeValueToStatusChars, getMemoryBankFromAbsoluteAddr,
} from '#utilities/memory.js';

export function initMemoryWithInput(memory, input) {
  const { chunks, startingPiDigitsPosition, f, m } = input;
  const startingDigitsPositionHW = hexToHWNumber(startingPiDigitsPosition);
  const mNum = parseInt(m, 16);

  putModulusBasedDataIntoMemory(memory, mNum);
  const [chunksCountL, chunksCountH] = numToHWNumber(0x100 - chunks.length);
  writeValueToStatusChars([0, 0, chunksCountL, chunksCountH], memory, VARIABLES.STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG);
  writeValueToStatusChars(startingDigitsPositionHW, memory, VARIABLES.STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION);
  writeValueToStatusChars(hexToHWNumber(f), memory, VARIABLES.STATUS_MEM_VARIABLE_F);
  writeValueToMainChars(numToHWNumber(mNum), memory, VARIABLES.MAIN_MEM_VARIABLE_DIV_DIVISOR);

  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
}
