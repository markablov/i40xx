const toHex = (val) => val.toString(16).toUpperCase().padStart(2, '0');

/*
 * Return true if instruction has two bytes - JCN, FIM, JUN, JMS, ISZ
 */
const isTwoByteInstructionByOpcode = (opcode) => (
  [0x10, 0x40, 0x50, 0x70].includes(opcode & 0xF0)
  || (((opcode & 0xF0) === 0x20) && ((opcode & 0x1) === 0x00))
);

/*
 * Updates source code to be more usable inside browser emulator GUI
 *   - source code lines follows bytecode order in resulting ROM
 *   - put ROM location directives to help linker to arrange code blocks
 *   - removes all original comments
 *   - adds comments with ROM location and bytecode info for instruction
 *   - adds preamble that contains initialization code to seed registers and memory with values
 */
export const updateCodeForUseInEmulator = (sourceCode, initializators, sourceMap, symbols, rom, romSize) => {
  const sourceLines = sourceCode.split('\n');

  if (!rom) {
    if (sourceMap && symbols) {
      for (const [idx, line] of sourceLines.entries()) {
        if (line.match(/^\s*__location/)) {
          sourceLines[idx] = undefined;
        }
      }

      const offsetToLineMap = new Map(sourceMap.map(({ line, romOffset }) => [romOffset, line - 1]));
      const insertedDirectives = new Set();
      for (const { romAddress } of symbols) {
        if (insertedDirectives.has(romAddress)) {
          continue;
        }
        const lineNo = offsetToLineMap.get(romAddress) - 1;
        sourceLines[lineNo] = `\n__location(0x${toHex(romAddress >> 8)}:0x${toHex(romAddress & 0xFF)})\n${sourceLines[lineNo]}`;
        insertedDirectives.add(romAddress);
      }
    }

    sourceLines.push(
      '__location(00:0x00)',
      '  JUN prepareTestData',
      '',
      'prepareTestData:',
      ...initializators.flat().map((line) => `  ${line}`),
      '  JUN entrypoint',
    );

    return sourceLines.filter(Boolean).join('\n');
  }

  const lines = ['__location(00:0x00)', '  JUN prepareTestData'];
  const sourceLinesTrim = sourceLines.map((line) => line.replace(/#.+/, '').trim());
  const romOffsetToLine = new Map(sourceMap.map(({ romOffset, line }) => [romOffset, line]));
  const romOffsetToLabel = new Map(symbols.map(({ romAddress, label }) => [romAddress, label]));
  const maxSourceCodeLineLen = Math.max(...sourceLinesTrim.map((line) => line.length));

  const insertedDirectives = new Set();
  // skip auto-generated jump to entrypoint
  for (let romOffset = 2; romOffset < romSize; romOffset++) {
    if (romOffsetToLabel.has(romOffset)) {
      if (!insertedDirectives.has(romOffset)) {
        lines.push('', `__location(0x${toHex(romOffset >> 8)}:0x${toHex(romOffset & 0xFF)})`);
        insertedDirectives.add(romOffset);
      }
      lines.push(`${romOffsetToLabel.get(romOffset)}:`);
    }

    const sourceCodeLine = romOffsetToLine.has(romOffset) ? sourceLinesTrim[romOffsetToLine.get(romOffset) - 1] : null;
    const romOffsetStr = `[${toHex(romOffset >> 8)}:${toHex(romOffset & 0xFF)}]`;
    if (sourceCodeLine) {
      const isTwoByteInstruction = isTwoByteInstructionByOpcode(rom[romOffset]);
      const romBytesStr = isTwoByteInstruction
        ? `${toHex(rom[romOffset])} ${toHex(rom[romOffset + 1])}`
        : toHex(rom[romOffset]);
      const commentsPadding = ' '.repeat(maxSourceCodeLineLen - sourceCodeLine.length + 1);
      lines.push(`  ${sourceCodeLine}${commentsPadding}# ${romOffsetStr} ${romBytesStr}`);

      if (isTwoByteInstruction) {
        romOffset++;
      }
    } else {
      lines.push(`  NOP ${' '.repeat(maxSourceCodeLineLen - 3)}# ${romOffsetStr} 00`);
    }
  }

  lines.push(
    'prepareTestData:',
    ...initializators.flat().map((line) => `  ${line}`),
    '  JUN entrypoint',
  );

  return lines.join('\n');
};

/*
 * Generate instructions to seed register with value
 */
export const generateRegisterInitialization = (regNo, value) => [
  '# init register',
  `LDM ${value}`,
  `XCH rr${regNo}`,
];

/*
 * Generate instructions to seed register with value
 */
export const generateAccumulatorInitialization = (value) => [`LDM ${value}`];

/*
 * Generate instructions to seed main characters in memory location with specified value
 */
export const generateMemoryMainCharactersInitialization = (memoryRegNo, values) => {
  const lines = [
    '# init main characters in RAM',
    `FIM r0, 0x${memoryRegNo.toString(16)}0`,
  ];

  for (let i = 0; i < 16; i++) {
    const value = values[i] || 0;
    lines.push(...[
      'SRC r0',
      ...(value ? [`LDM ${value}`, 'WRM'] : []),
      'INC rr1',
    ]);
  }

  return lines;
};

/*
 * Generate instructions to seed status characters in memory location with specified value
 */
export const generateMemoryStatusCharactersInitialization = (memoryRegNo, values) => [
  `FIM r0, 0x${memoryRegNo.toString(16)}0`,
  'SRC r0',
  ...(values[0] ? [`LDM ${values[0]}`, 'WR0'] : []),
  ...(values[1] ? [`LDM ${values[1]}`, 'WR1'] : []),
  ...(values[2] ? [`LDM ${values[2]}`, 'WR2'] : []),
  ...(values[3] ? [`LDM ${values[3]}`, 'WR3'] : []),
];

/*
 * Generate instruction to switch memory bank
 */
export const generateMemoryBankSwitch = (bankNo) => [`LDM ${bankNo}`, 'DCL'];
