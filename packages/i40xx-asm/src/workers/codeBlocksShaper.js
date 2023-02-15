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

    const { blockIdx, instructionOffset } = instructionsMap[refInstructionIdx];
    block.references[refIdx] = {
      addressOffset,
      refBlockIdx: blockIdx,
      refInstructionOffset: instructionOffset,
      isShort,
    };

    if (isShort && blocks[blockIdx] !== block) {
      blocks[blockIdx].isDependant = true;
    }
  }
};

/*
 * Extend existing block with more bytecode and references
 */
const extendExistingBlock = (blocks, blockInstructionIdx, instructionsMap, bytecode, references, sourceCodeLines) => {
  const { blockIdx } = instructionsMap[blockInstructionIdx];
  const block = blocks[blockIdx];

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
  const mergingBlockIdx = instructionsMap[mergingBlockInstructionIdx].blockIdx;
  while (instructionsMap[mergingBlockInstructionIdx]?.blockIdx === mergingBlockIdx) {
    instructionsMap[mergingBlockInstructionIdx].blockIdx = blockIdx;
    mergingBlockInstructionIdx--;
  }

  let existingBlockInstructionIdx = blockInstructionIdx;
  while (instructionsMap[existingBlockInstructionIdx]?.blockIdx === blockIdx) {
    instructionsMap[existingBlockInstructionIdx].instructionOffset += bytecode.length;
    existingBlockInstructionIdx++;
  }

  return block;
};

/*
 * Forms code block for routine
 */
const createCodeBlock = (blocks, firstInstructionIdx, instructions, instructionsMap, romPage, romOffset) => {
  const blockIdx = blocks.length;
  const bytecode = [];
  const references = [];
  const sourceCodeLines = [];

  if (instructionsMap[firstInstructionIdx]) {
    return { isNew: false, block: blocks[instructionsMap[firstInstructionIdx].blockIdx] };
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

    instructionsMap[instructionIdx] = { blockIdx, instructionOffset };

    if (refInstructionIdx !== undefined && refInstructionIdx !== null) {
      references.push({
        addressOffset: instructionOffset + 1,
        refInstructionIdx,
        isShort: type === INSTRUCTION_TYPES.JumpConditional,
      });
    }

    if ([INSTRUCTION_TYPES.FarJump, INSTRUCTION_TYPES.Return, INSTRUCTION_TYPES.Halt].includes(type)) {
      const block = {
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
const getEntrypointBlock = (blocks) => {
  const existingBlock = blocks.find(({ fixedLocation }) => fixedLocation.page === 0 && fixedLocation.offset === 0);
  if (existingBlock) {
    return existingBlock;
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
  return block;
};

const formBlocksFromInstructions = (fixedLocations, instructions, symbols) => {
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

  const entrypointBlock = getEntrypointBlock(blocks);
  const blocksQueue = entrypointBlock.references.map(({ refInstructionIdx }) => refInstructionIdx);
  while (blocksQueue.length) {
    const instructionIdx = blocksQueue.shift();

    const { block, isNew } = createCodeBlock(blocks, instructionIdx, instructions, instructionsMap);
    if (isNew) {
      blocks.push(block);
    }

    // always need to re-scan references, because even already existing blocks could be extended
    blocksQueue.push(
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

  return {
    blocks,
    symbols: symbols.map(({ label, instructionIdx }) => ({ label, ...instructionsMap[instructionIdx] })),
  };
};

module.exports = {
  formBlocksFromInstructions,
};
