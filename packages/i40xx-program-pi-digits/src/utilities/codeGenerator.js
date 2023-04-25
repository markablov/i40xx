const toHexByte = (val) => val.toString(16).toUpperCase().padStart(2, '0');

/*
 * Updates source code to be more usable inside browser emulator GUI
 *   - adds preamble that contains initialization code to seed registers and memory with values
 *   - put ROM location directives to help linker to arrange code blocks
 */
export const updateCodeForUseInEmulator = (sourceCode, initializators, sourceMap, symbols) => {
  const lines = sourceCode.split('\n');

  if (sourceMap && symbols) {
    for (const [idx, line] of lines.entries()) {
      if (line.match(/^\s*__location/)) {
        lines[idx] = undefined;
      }
    }

    const offsetToLineMap = new Map(sourceMap.map(({ line, romOffset }) => [romOffset, line - 1]));
    const insertedDirectives = new Set();
    for (const { romAddress } of symbols) {
      if (insertedDirectives.has(romAddress)) {
        continue;
      }
      const lineNo = offsetToLineMap.get(romAddress) - 1;
      lines[lineNo] = `\n__location(0x${toHexByte(romAddress >> 8)}:0x${toHexByte(romAddress & 0xFF)})\n${lines[lineNo]}`;
      insertedDirectives.add(romAddress);
    }
  }

  lines.push(
    '__location(00:0x00)',
    '  JUN prepareTestData',
    '',
    'prepareTestData:',
    ...initializators.flat().map((line) => `  ${line}`),
    '  JUN entrypoint',
  );

  return lines.filter(Boolean).join('\n');
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
