const { INSTRUCTION_TYPES } = require('../const.js');
const { assemblyInstruction } = require('../parser/assembly.js');

/*
 * Converts references from instruction indexes from flat instructions array to references to block
 */
const transformRefsToBlockReferences = (blocks, block, instructionsMap) => {
  for (const [refIdx, { addressOffset, refInstructionIdx, isShort }] of block.references.entries()) {
    if (!instructionsMap[refInstructionIdx]) {
      throw Error('Some references to labels are broken: labeled code has not been processed');
    }

    const { blockId, instructionOffset } = instructionsMap[refInstructionIdx];
    block.references[refIdx] = {
      addressOffset,
      refBlockId: blockId,
      refInstructionOffset: instructionOffset,
      isShort,
    };

    if (isShort && blocks[blockId] !== block) {
      blocks[blockId].isDependant = true;
    }
  }
};

/*
 * Extend existing block with more bytecode and references
 */
const extendExistingBlock = (blocks, blockInstructionIdx, instructionsMap, bytecode, references, sourceCodeLines) => {
  const { blockId } = instructionsMap[blockInstructionIdx];
  const block = blocks[blockId];

  block.bytecode.unshift(...bytecode);

  for (const existingBlockReference of block.references) {
    existingBlockReference.addressOffset += bytecode.length;
  }
  block.references.unshift(...references);

  for (const existingBlockSourceCodeLine of block.sourceCodeLines) {
    existingBlockSourceCodeLine.instructionOffset += bytecode.length;
  }
  block.sourceCodeLines.unshift(...sourceCodeLines);

  let mergingBlockInstructionIdx = blockInstructionIdx - 1;
  const mergingBlockId = instructionsMap[mergingBlockInstructionIdx].blockId;
  while (instructionsMap[mergingBlockInstructionIdx]?.blockId === mergingBlockId) {
    instructionsMap[mergingBlockInstructionIdx].blockId = blockId;
    mergingBlockInstructionIdx--;
  }

  let existingBlockInstructionIdx = blockInstructionIdx;
  while (instructionsMap[existingBlockInstructionIdx]?.blockId === blockId) {
    instructionsMap[existingBlockInstructionIdx].instructionOffset += bytecode.length;
    existingBlockInstructionIdx++;
  }

  return block;
};

/*
 * Forms code block for routine
 */
const createCodeBlock = (blocks, firstInstructionIdx, instructions, instructionsMap, romPage, romOffset) => {
  const blockId = blocks.length;
  const bytecode = [];
  const references = [];
  const sourceCodeLines = [];

  if (instructionsMap[firstInstructionIdx]) {
    return { isNew: false, block: blocks[instructionsMap[firstInstructionIdx].blockId] };
  }

  for (let instructionIdx = firstInstructionIdx; instructionIdx < instructions.length; instructionIdx++) {
    if (instructionsMap[instructionIdx]) {
      const block = extendExistingBlock(blocks, instructionIdx, instructionsMap, bytecode, references, sourceCodeLines);
      return { isNew: false, block };
    }

    const { type, opcode, sourceCodeLine, refInstructionIdx } = instructions[instructionIdx];
    const instructionOffset = bytecode.length;

    bytecode.push(...opcode);

    sourceCodeLines.push({ instructionOffset, line: sourceCodeLine });

    instructionsMap[instructionIdx] = { blockId, instructionOffset };

    if (refInstructionIdx !== undefined && refInstructionIdx !== null) {
      references.push({
        addressOffset: instructionOffset + 1,
        refInstructionIdx,
        isShort: type === INSTRUCTION_TYPES.JumpConditional,
      });
    }

    if ([INSTRUCTION_TYPES.FarJump, INSTRUCTION_TYPES.Return, INSTRUCTION_TYPES.Halt].includes(type)) {
      const block = {
        id: blockId,
        bytecode,
        sourceCodeLines,
        references,
        ...(romPage !== undefined && { fixedLocation: { page: romPage, offset: romOffset } }),
      };

      return { isNew: true, block };
    }
  }

  throw Error("Couldn't find final instruction for code block at fixed location.");
};

/*
 * If we don't have entrypoint specified (by marking instruction with fixed location 0x00:0x00), then we need to create
 *   JUN instruction as entrypoint to instruction #0 from source code.
 */
const createEntrypointBlock = (blocks) => {
  const existingBlock = blocks.find(({ fixedLocation }) => fixedLocation.page === 0 && fixedLocation.offset === 0);
  if (existingBlock) {
    return;
  }

  const { block } = createCodeBlock(
    blocks,
    0,
    [{
      opcode: assemblyInstruction('jun', 0x00),
      type: INSTRUCTION_TYPES.FarJump,
      refInstructionIdx: 0,
      sourceCodeLine: -1,
    }],
    {},
    0,
    0,
  );

  blocks.push(block);
};

/*
 * Return initial list of starting instructions, that could be part of new blocks
 */
const getReferencedInstructionsFromFixedBlocks = (fixedBlocks, instructionsMap) => {
  const instructionIndexes = new Set();

  for (const { references } of fixedBlocks) {
    for (const { refInstructionIdx } of references) {
      if (!instructionsMap[refInstructionIdx]) {
        instructionIndexes.add(refInstructionIdx);
      }
    }
  }

  return [...instructionIndexes];
};

const formBlocksFromInstructions = (fixedLocations, instructions, symbols, fixedRomBanks) => {
  const blocks = [];
  const instructionsMap = new Array(instructions.length);

  for (const { instructionIdx, romPage, romOffset } of fixedLocations) {
    const { block: fixedBlock, isNew } = createCodeBlock(
      blocks,
      instructionIdx,
      instructions,
      instructionsMap,
      romPage,
      romOffset,
    );

    if (isNew) {
      blocks.push(fixedBlock);
    }
  }

  createEntrypointBlock(blocks);

  const instructionsToFormBlocks = getReferencedInstructionsFromFixedBlocks(blocks, instructionsMap);
  while (instructionsToFormBlocks.length) {
    const instructionIdx = instructionsToFormBlocks.shift();

    const { block, isNew } = createCodeBlock(blocks, instructionIdx, instructions, instructionsMap);
    if (isNew) {
      blocks.push(block);
    }

    // always need to re-scan references, because even already existing blocks could be extended
    instructionsToFormBlocks.push(
      ...(
        block.references
          .map(({ refInstructionIdx }) => refInstructionIdx)
          .filter((refInstructionIdx) => !instructionsMap[refInstructionIdx])
      ),
    );
  }

  for (const block of blocks) {
    transformRefsToBlockReferences(blocks, block, instructionsMap);
  }

  for (const { instructionIdx, bankNo } of fixedRomBanks) {
    if (instructionsMap[instructionIdx]) {
      blocks[instructionsMap[instructionIdx].blockId].fixedBank = bankNo;
    }
  }

  return {
    blocks,
    symbols: symbols.map(({ label, instructionIdx }) => ({ label, ...instructionsMap[instructionIdx] })),
  };
};

module.exports = {
  formBlocksFromInstructions,
};
