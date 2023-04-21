/* eslint-disable no-console */

import * as fs from 'node:fs';

import { compile } from 'i40xx-asm';
import { buildRom } from 'i40xx-link';

/*
 * Return true if instruction has two bytes - JCN, FIM, JUN, JMS, ISZ
 */
const isTwoByteInstructionByOpcode = (opcode) => (
  [0x10, 0x40, 0x50, 0x70].includes(opcode & 0xF0)
  || (((opcode & 0xF0) === 0x20) && ((opcode & 0x1) === 0x00))
);

/*
 * Convert number to 16-bit representation: 123 -> 7B or 10 -> 0A
 */
const toHex = (val) => val.toString(16).toUpperCase().padStart(2, '0');

(function main() {
  const sourceCode = fs.readFileSync(process.argv[2], 'utf-8');
  const { blocks, symbols: blockAddressedSymbols, errors } = compile(sourceCode);
  if (errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const { rom, symbols, sourceMap, romSize } = buildRom(blocks, blockAddressedSymbols);

  const sourceLines = sourceCode.split('\n').map((line) => line.replace(/#.+/, '').trim());
  const romOffsetToLine = new Map(sourceMap.map(({ romOffset, line }) => [romOffset, line]));
  const romOffsetToLabel = new Map(symbols.map(({ romAddress, label }) => [romAddress, label]));

  for (let romOffset = 0; romOffset < romSize; romOffset++) {
    const romOffsetStr = `[${toHex(romOffset >> 8)}:${toHex(romOffset & 0xFF)}]`;
    if (romOffsetToLabel.has(romOffset)) {
      console.log(`${romOffsetStr}       ${romOffsetToLabel.get(romOffset)}:`);
    }

    const sourceCodeLine = romOffsetToLine.has(romOffset) ? sourceLines[romOffsetToLine.get(romOffset) - 1] : '???';
    const isTwoByteInstruction = isTwoByteInstructionByOpcode(rom[romOffset]);
    const romBytesStr = isTwoByteInstruction
      ? ` ${toHex(rom[romOffset])} ${toHex(rom[romOffset + 1])}   `
      : ` ${toHex(rom[romOffset])}      `;
    console.log(`${romOffsetStr}${romBytesStr}${sourceCodeLine}`);

    if (isTwoByteInstruction) {
      romOffset++;
    }
  }
}());
