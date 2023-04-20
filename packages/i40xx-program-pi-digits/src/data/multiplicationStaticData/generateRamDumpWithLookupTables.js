import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { numToHWNumber } from '#utilities/numbers.js';

const addMulTableEntry = (ramDump, a, b, bankNo, lowCharNo) => {
  ramDump[bankNo][a].status[lowCharNo] = (a * b) & 0xF;
  ramDump[bankNo][a].status[lowCharNo + 1] = (a * b) >> 4;
};

(function main() {
  const ramDump = Array.from(
    Array(8),
    () => Array.from(Array(16), () => ({ main: Array(16).fill(0), status: Array(4).fill(0) })),
  );

  for (let value = 0; value < 16; value++) {
    // shift tables
    ramDump[1][value].status[0] = (value << 2) & 0xF;
    ramDump[1][value].status[1] = (value >> 2) & 0xF;

    // mul tables
    addMulTableEntry(ramDump, value, 0x3, 1, 2);
    addMulTableEntry(ramDump, value, 0x5, 2, 0);
    addMulTableEntry(ramDump, value, 0x6, 2, 2);
    addMulTableEntry(ramDump, value, 0x7, 4, 0);
    addMulTableEntry(ramDump, value, 0x9, 4, 2);
    addMulTableEntry(ramDump, value, 0xA, 3, 0);
    addMulTableEntry(ramDump, value, 0xB, 3, 2);
    addMulTableEntry(ramDump, value, 0xC, 5, 0);
    addMulTableEntry(ramDump, value, 0xD, 5, 2);
    addMulTableEntry(ramDump, value, 0xE, 6, 0);
    addMulTableEntry(ramDump, value, 0xF, 6, 2);
  }

  // tables for exponentiation
  ramDump[7][0x6].main = [
    ...numToHWNumber(0x11 ** 2, 4),
    ...numToHWNumber(0x13 ** 2, 4),
    ...numToHWNumber(0x3 ** 5, 4),
    ...numToHWNumber(0x17 ** 2, 4),
  ];

  ramDump[7][0x7].main = [
    ...numToHWNumber(0x3 ** 6, 4),
    ...numToHWNumber(0x3 ** 3, 4),
    ...numToHWNumber(0x5 ** 3, 4),
    ...numToHWNumber(0x7 ** 3, 4),
  ];

  ramDump[7][0xB].main = [
    ...numToHWNumber(0x3 ** 7, 4),
    ...numToHWNumber(0x3 ** 4, 4),
    ...numToHWNumber(0x5 ** 4, 4),
    ...numToHWNumber(0x0, 4),
  ];

  const dumpPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './ramWithLookupTables.json');
  fs.writeFileSync(dumpPath, JSON.stringify(ramDump, undefined, 2));
}());
