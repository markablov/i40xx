import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';
import { writeValueToMainChars, writeValueToStatusChars, getMemoryBankFromAbsoluteAddr } from '#utilities/memory.js';

export function initMemoryWithInput(memory, input) {
  const { chunks, startingPiDigitsPosition, a, N } = input;
  const numN = parseInt(N, 16);

  writeValueToMainChars(hexToHWNumber(a), memory, 0x9);
  writeValueToMainChars(numToHWNumber(2 * numN), memory, 0xB);
  writeValueToStatusChars(numToHWNumber(numN), memory, 0xE);
  writeValueToStatusChars(numToHWNumber(startingPiDigitsPosition), memory, 0xC);
  writeValueToStatusChars(numToHWNumber(chunks.length), memory, 0x6);
  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
}
