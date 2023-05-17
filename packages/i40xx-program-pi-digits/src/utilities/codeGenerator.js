/*
 * Updates source code to be more usable inside browser emulator GUI
 *   - adds preamble that contains initialization code to seed registers and memory with values
 */
export const updateCodeForUseInEmulator = (sourceCode, initializators = []) => (`__location(00:0x00)
  JUN prepareTestData
${sourceCode}
prepareTestData:
${initializators.flat().map((line) => `  ${line}`).join('\n')}
  JUN entrypoint
`);

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

/*
 * Generate instruction to switch register index bank
 */
export const generateRegisterBankSwitch = (bankNo) => [bankNo === 0 ? 'SB0' : 'SB1'];
