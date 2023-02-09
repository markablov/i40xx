module.exports = [
  {
    // [block #0] trampoline
    bytecode: [0x40, 0x00],
    fixedLocation: { offset: 0, page: 0 },
    references: [{ addressOffset: 1, isShort: false, refBlockIdx: 1, refInstructionOffset: 0 }],
    sourceCodeLines: [{ instructionOffset: 0, line: -1 }], // JUN entrypoint
  },
  {
    // [block #1] main
    bytecode: [0x50, 0x00, 0x14, 0x00, 0xD1, 0x40, 0x00],
    references: [
      { addressOffset: 1, isShort: false, refBlockIdx: 2, refInstructionOffset: 0 },
      { addressOffset: 3, isShort: true, refBlockIdx: 3, refInstructionOffset: 0 },
      { addressOffset: 6, isShort: false, refBlockIdx: 4, refInstructionOffset: 1 },
    ],
    sourceCodeLines: [
      { instructionOffset: 0, line: 2 }, // JMS firstCheck
      { instructionOffset: 2, line: 3 }, // JCN z, main_cont1
      { instructionOffset: 4, line: 4 }, // LDM 0x1
      { instructionOffset: 5, line: 5 }, // JUN main_return
    ],
  },
  {
    // [block #2] firstCheck
    bytecode: [0xC0],
    references: [],
    sourceCodeLines: [{ instructionOffset: 0, line: 21 }], // BBL 0
  },
  {
    // [block #3] main_cont1
    bytecode: [0x50, 0x00, 0x14, 0x00, 0xD2, 0x40, 0x00],
    isDependant: true,
    references: [
      { addressOffset: 1, isShort: false, refBlockIdx: 5, refInstructionOffset: 0 },
      { addressOffset: 3, isShort: true, refBlockIdx: 4, refInstructionOffset: 0 },
      { addressOffset: 6, isShort: false, refBlockIdx: 4, refInstructionOffset: 1 },
    ],
    sourceCodeLines: [
      { instructionOffset: 0, line: 7 },  // JMS secondCheck
      { instructionOffset: 2, line: 8 },  // JCN z, main_cont2
      { instructionOffset: 4, line: 9 },  // LDM 0x2
      { instructionOffset: 5, line: 10 }, // JUN main_return
    ],
  },
  {
    // [block #4] main_cont2
    bytecode: [0xD0, 0x14, 0x00, 0x50, 0x00, 0xB0, 0xC0],
    isDependant: true,
    references: [
      { addressOffset: 2, isShort: true, refBlockIdx: 4, refInstructionOffset: 5 },
      { addressOffset: 4, isShort: false, refBlockIdx: 6, refInstructionOffset: 0 },
    ],
    sourceCodeLines: [
      { instructionOffset: 0, line: 12 }, // LDM 0x0
      // main_return:
      { instructionOffset: 1, line: 14 }, // JCN z, main_skip_cleanup
      { instructionOffset: 3, line: 15 }, // JMS cleanup
      // main_skip_cleanup:
      { instructionOffset: 5, line: 17 }, // XCH rr0
      { instructionOffset: 6, line: 18 }, // BBL 0
    ],
  },
  {
    // [block #5] secondCheck
    bytecode: [0xC0],
    references: [],
    sourceCodeLines: [{ instructionOffset: 0, line: 24 }], // BBL 0
  },
  {
    // [block #6] cleanup
    bytecode: [0xC0],
    references: [],
    sourceCodeLines: [{ instructionOffset: 0, line: 27 }], // BBL 0
  },
];
