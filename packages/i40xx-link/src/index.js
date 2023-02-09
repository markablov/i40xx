import { getPermutations } from './utilities/combinatorics.js';

const RomPages = class RomPages {
  static ROM_PAGES_COUNT = 0xF;

  static BYTES_PER_ROM_PAGE = 0x100;

  static getAbsoluteAddress(page, offset) {
    return page * RomPages.BYTES_PER_ROM_PAGE + offset;
  }

  static getPageFromAddress(address) {
    return Math.trunc(address / RomPages.BYTES_PER_ROM_PAGE);
  }

  #currentPage = 0;

  #currentPageOffset = 0;

  #pages = 0;

  #blocksRomOffsets = new Map();

  constructor() {
    this.#pages = Array.from(new Array(RomPages.ROM_PAGES_COUNT), () => (new Uint8Array(RomPages.BYTES_PER_ROM_PAGE)));
  }

  goToNextPage() {
    this.#currentPage++;
    this.#currentPageOffset = 0;
    if (this.#currentPage >= RomPages.ROM_PAGES_COUNT) {
      throw Error("Couldn't fit all codeblocks into ROM!");
    }
  }

  /*
   * Append block to ROM and advance cursor
   */
  appendBlock(block, blockIdx, page, offset) {
    if (page !== undefined && offset !== undefined) {
      if (page < this.#currentPage) {
        throw Error('Wrong order of blocks to append to ROM!');
      }

      if (page === this.#currentPage && offset < this.#currentPageOffset) {
        throw Error('Wrong order of blocks to append to ROM!');
      }

      this.#currentPage = page;
      this.#currentPageOffset = offset;
    }

    const absoluteAddress = RomPages.getAbsoluteAddress(this.#currentPage, this.#currentPageOffset);
    this.#blocksRomOffsets.set(blockIdx, { page: this.#currentPage, offset: this.#currentPageOffset });

    const blockSize = block.bytecode.length;
    const freeSpaceInCurrentPage = RomPages.BYTES_PER_ROM_PAGE - this.#currentPageOffset;
    if (freeSpaceInCurrentPage > blockSize) {
      this.#pages[this.#currentPage].set(block.bytecode, this.#currentPageOffset);
      this.#currentPageOffset += blockSize;
      return absoluteAddress;
    }

    this.goToNextPage();

    let blockOffset = freeSpaceInCurrentPage;
    while (blockOffset < blockSize) {
      const bytesLeft = blockSize - blockOffset;
      if (bytesLeft >= RomPages.BYTES_PER_ROM_PAGE) {
        const currentBytecodeChunk = block.bytecode.slice(blockOffset, blockOffset + RomPages.BYTES_PER_ROM_PAGE);
        this.#pages[this.#currentPage].set(currentBytecodeChunk, 0);
        this.goToNextPage();
        blockOffset += RomPages.BYTES_PER_ROM_PAGE;
        continue;
      }

      this.#pages[this.#currentPage].set(block.bytecode.slice(blockOffset), 0);
      this.#currentPageOffset = bytesLeft;
      return absoluteAddress;
    }

    return absoluteAddress;
  }

  /*
   * Updates encoded address in bytecode
   *
   * For short jumps, 2nd byte of instruction is updated, for long jumps we also modify 1st byte of instruction to
   *   include highest 4bit of address.
   */
  updateEncodedAddress(blockIdx, addressOffset, referencedBlockIdx, referencedInstructionOffset, isShort) {
    const { page, offset } = this.#blocksRomOffsets.get(blockIdx);
    const { page: refPage, offset: refBlockOffset } = this.#blocksRomOffsets.get(referencedBlockIdx);
    const address = RomPages.getAbsoluteAddress(refPage, refBlockOffset + referencedInstructionOffset);
    const absoluteOffset = offset + addressOffset;
    this.#pages[page][absoluteOffset] = address & 0xFF;
    if (!isShort) {
      this.#pages[page][absoluteOffset - 1] = this.#pages[page][absoluteOffset - 1] | (address >> 8);
    }
  }

  get usedSpaceInPage() {
    return this.#currentPageOffset;
  }

  get rom() {
    return Uint8Array.from(Array.prototype.concat(...this.#pages.map((page) => Array.from(page))));
  }

  get romSize() {
    return this.#currentPage * RomPages.BYTES_PER_ROM_PAGE + this.#currentPageOffset;
  }
};

/*
 * Checks if placement variant satisfies short calls limitations:
 *  - caller instruction should not be at last two words on the ROM page
 *  - caller instruction and callee block first instruction should be on the same ROM page
 */
const checkPlacementVariant = (blocks, blocksRomOffsets, callerBlockIdx) => {
  const callerBlockRomOffset = blocksRomOffsets.get(callerBlockIdx);

  for (const { addressOffset, refBlockIdx, refInstructionOffset, isShort } of blocks[callerBlockIdx].references) {
    if (!isShort) {
      continue;
    }

    const absoluteOffset = callerBlockRomOffset + (addressOffset - 1);
    if ((absoluteOffset % RomPages.BYTES_PER_ROM_PAGE) >= (RomPages.BYTES_PER_ROM_PAGE - 1)) {
      return false;
    }

    const callerRomPage = RomPages.getPageFromAddress(absoluteOffset);
    const calleeRomPage = RomPages.getPageFromAddress(blocksRomOffsets.get(refBlockIdx) + refInstructionOffset);
    if (callerRomPage !== calleeRomPage) {
      return false;
    }
  }

  return true;
};

/*
 * Returns array with block index and indexes of all dependant blocks
 */
const getCoupledBlocksIndexes = (blocks, firstBlockIdx) => {
  const coupledBlocks = new Set();
  const blocksToAdd = [firstBlockIdx];

  while (blocksToAdd.length) {
    const blockIdx = blocksToAdd.shift();
    if (coupledBlocks.has(blockIdx)) {
      continue;
    }

    coupledBlocks.add(blockIdx);
    blocksToAdd.push(...blocks[blockIdx].references.filter((block) => block.isShort).map((block) => block.refBlockIdx));
  }

  return [...coupledBlocks];
};

/*
 * Tries to place code block into ROM
 *
 * Returns true if it was possible to do
 */
const placeCodeBlock = (blocks, attemptedBlockIdx, romPages, sourceMap) => {
  // callee blocks could be rearranged as well, but should not be a lot of variants to check
  const placementVariants = getPermutations(getCoupledBlocksIndexes(blocks, attemptedBlockIdx));
  for (const placementVariant of placementVariants) {
    const blocksRelativeRomOffsets = new Map();

    let offset = romPages.usedSpaceInPage;
    for (const blockIdx of placementVariant) {
      blocksRelativeRomOffsets.set(blockIdx, offset);
      offset += blocks[blockIdx].bytecode.length;
    }

    if (!checkPlacementVariant(blocks, blocksRelativeRomOffsets, attemptedBlockIdx)) {
      continue;
    }

    for (const blockIdx of placementVariant) {
      const block = blocks[blockIdx];
      const romAddress = romPages.appendBlock(block, blockIdx);
      for (const { instructionOffset, line } of block.sourceCodeLines) {
        sourceMap.push({ romOffset: romAddress + instructionOffset, line });
      }
    }

    return true;
  }

  return false;
};

/*
 * Return size of block with all dependant blocks
 */
const getFullBlockSize = (blocks, primaryBlockIdx) => {
  const blocksChecked = new Set([]);
  const blocksQueue = [primaryBlockIdx];

  let sum = 0;
  while (blocksQueue.length) {
    const blockIdx = blocksQueue.shift();
    if (blocksChecked.has(blockIdx)) {
      continue;
    }

    const { bytecode, references } = blocks[blockIdx];
    sum += bytecode.length;
    blocksQueue.push(...references.filter(({ isShort }) => isShort).map(({ refBlockIdx }) => refBlockIdx));
    blocksChecked.add(blockIdx);
  }

  return sum;
};

/*
 * Updates encoded addresses for jump instructions, we can do it only after we formed ROM layout
 */
const updateAddressesInBytecode = (blocks, romPages) => {
  for (const [idx, { references }] of blocks.entries()) {
    for (const { addressOffset, refBlockIdx, refInstructionOffset, isShort } of references) {
      romPages.updateEncodedAddress(idx, addressOffset, refBlockIdx, refInstructionOffset, isShort);
    }
  }
};

/*
 * Try to place all code blocks into ROM in some kind of optimal manner
 */
const fillRomWithBlocks = (blocks, sortedPrimaryBlocks, romPages, sourceMap) => {
  while (sortedPrimaryBlocks.size) {
    let hasAnyCodeBlockFit = false;
    for (const codeBlock of sortedPrimaryBlocks) {
      if (placeCodeBlock(blocks, codeBlock.idx, romPages, sourceMap)) {
        sortedPrimaryBlocks.delete(codeBlock);
        hasAnyCodeBlockFit = true;
        break;
      }
    }

    if (!hasAnyCodeBlockFit) {
      romPages.goToNextPage();
    }
  }
};

/*
 * Return Set with primary blocks, sorted by their sizes (including dependant blocks)
 */
const getSortedPrimaryBlocks = (blocks) => {
  const primaryCodeBlocks = blocks
    .map((block, idx) => ({ ...block, idx }))
    .filter(({ isDependant, fixedLocation }) => !isDependant && !fixedLocation);

  return new Set(primaryCodeBlocks.sort((a, b) => getFullBlockSize(blocks, b.idx) - getFullBlockSize(blocks, a.idx)));
};

/*
 * Places all code blocks, for which location is specified, into ROM
 */
const fillRomWithFixedBlocks = (blocks, romPages, sourceMap) => {
  const getAbsoluteAddress = ({ fixedLocation: { page, offset } }) => RomPages.getAbsoluteAddress(page, offset);

  const fixedBlocks = blocks
    .map((block, idx) => ({ ...block, idx }))
    .filter(({ fixedLocation }) => !!fixedLocation)
    .sort((a, b) => getAbsoluteAddress(a) - getAbsoluteAddress(b));

  for (const block of fixedBlocks) {
    const romAddress = romPages.appendBlock(block, block.idx, block.fixedLocation.page, block.fixedLocation.offset);
    for (const { instructionOffset, line } of block.sourceCodeLines) {
      sourceMap.push({ romOffset: romAddress + instructionOffset, line });
    }
  }
};

/*
 * Returns { rom, sourceMap }
 *
 * Expects code blocks in format:
 * {
 *   bytecode,
 *   sourceCodeLines: [{ instructionOffset, line }],
 *   references: [{ addressOffset, refBlockIdx, refInstructionOffset, isShort }],
 *   isDependant,
 *   fixedLocation: { page, offset },
 * }
 */
export function buildRom(codeBlocks) {
  const sourceMap = [];
  const romPages = new RomPages();

  fillRomWithFixedBlocks(codeBlocks, romPages, sourceMap);
  fillRomWithBlocks(codeBlocks, getSortedPrimaryBlocks(codeBlocks), romPages, sourceMap);
  updateAddressesInBytecode(codeBlocks, romPages);

  return { sourceMap, rom: romPages.rom, romSize: romPages.romSize };
}
