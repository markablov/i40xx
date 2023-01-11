/*
 * Updates source code with preamble that contains initialization code to seed registers and memory with values
 */
export const addInitializationWithTestValues = (sourceCode, initializators) => {
  const preparationRoutineStartPos = sourceCode.indexOf('prepareTestData:');
  return `
${sourceCode.substring(0, preparationRoutineStartPos)}

prepareTestData:
${initializators.flat().map((line) => `  ${line}`).join('\n')}
  BBL 0

end:
  `;
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
 * Generate instructions to seed main characters in memory location with specified value
 */
export const generateMemoryMainCharactersInitialization = (memoryRegNo, values) => {
  const lines = [
    '# init main characters in RAM',
    `FIM r0, 0x${memoryRegNo}0`,
  ];

  for (let i = 0; i < 16; i++) {
    const value = values[i] || 0;
    lines.push(...[
      'SRC r0',
      `LDM ${value}`,
      'WRM',
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
  `LDM ${values[0] || 0}`,
  'WR0',
  `LDM ${values[1] || 0}`,
  'WR1',
  `LDM ${values[2] || 0}`,
  'WR2',
  `LDM ${values[3] || 0}`,
  'WR3',
];

/*
 * Generate instruction to switch memory bank
 */
export const generateMemoryBankSwitch = (bankNo) => [`LDM ${bankNo}`, 'DCL'];
