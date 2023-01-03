import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

(function main() {
  const ramDump = Array.from(
    Array(8),
    () => Array.from(Array(16), () => ({ main: Array(16).fill(0), status: Array(4).fill(0) })),
  );

  // shift tables
  for (let value = 0; value < 16; value++) {
    ramDump[0][value].status[0] = (value << 1) & 0xF;
    ramDump[0][value].status[1] = (value << 3) & 0xF;
    ramDump[0][value].status[2] = (value >> 1) & 0xF;
    ramDump[0][value].status[3] = (value >> 3) & 0xF;
    ramDump[1][value].status[0] = (value << 2) & 0xF;
    ramDump[1][value].status[1] = (value >> 2) & 0xF;
  }

  const dumpPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './ramWithLookupTables.json');
  fs.writeFileSync(dumpPath, JSON.stringify(ramDump, undefined, 2));
}());
