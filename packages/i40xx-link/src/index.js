const MINIMAL_BLOCKS_SET_TO_CACHE = 3;

const RomPages = class RomPages {
  static ROM_PAGES_COUNT = 0x10;

  static BYTES_PER_ROM_PAGE = 0x100;

  static getAbsoluteAddress(page, offset) {
    return page * RomPages.BYTES_PER_ROM_PAGE + offset;
  }

  static getPageFromAddress(address) {
    return Math.trunc(address / RomPages.BYTES_PER_ROM_PAGE);
  }

  static getPageOffsetFromAddress(address) {
    return address % RomPages.BYTES_PER_ROM_PAGE;
  }

  #currentPage = 0;

  #currentPageOffset = 0;

  #pages = [];

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

  addSingleBytePadding() {
    this.#currentPageOffset++;
    if (this.#currentPageOffset === RomPages.BYTES_PER_ROM_PAGE) {
      this.goToNextPage();
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
    this.#blocksRomOffsets.set(blockIdx, absoluteAddress);

    const blockSize = block.bytecode.length;
    const freeSpaceInCurrentPage = RomPages.BYTES_PER_ROM_PAGE - this.#currentPageOffset;
    if (freeSpaceInCurrentPage > blockSize) {
      this.#pages[this.#currentPage].set(block.bytecode, this.#currentPageOffset);
      this.#currentPageOffset += blockSize;
      return absoluteAddress;
    }

    this.#pages[this.#currentPage].set(block.bytecode.slice(0, freeSpaceInCurrentPage), this.#currentPageOffset);
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
    const absoluteBlockAddress = this.#blocksRomOffsets.get(blockIdx);
    const absoluteTargetBlockAddress = this.#blocksRomOffsets.get(referencedBlockIdx);
    const targetAddress = absoluteTargetBlockAddress + referencedInstructionOffset;
    const absoluteAddressOffset = absoluteBlockAddress + addressOffset;
    const pageWithLowPartOfAddress = this.#pages[RomPages.getPageFromAddress(absoluteAddressOffset)];
    const pageOffsetWithLowPartOfAddress = RomPages.getPageOffsetFromAddress(absoluteAddressOffset);
    pageWithLowPartOfAddress[pageOffsetWithLowPartOfAddress] = targetAddress & 0xFF;
    if (isShort) {
      return;
    }

    // to handle cases when instruction placed at XX:0xFF location, we need to re-evaluate page number and offsets
    const pageWithHighPartOfAddress = this.#pages[RomPages.getPageFromAddress(absoluteAddressOffset - 1)];
    const pageOffsetWithHighPartOfAddress = RomPages.getPageOffsetFromAddress(absoluteAddressOffset - 1);
    const instruction = pageWithHighPartOfAddress[pageOffsetWithHighPartOfAddress];
    pageWithHighPartOfAddress[pageOffsetWithHighPartOfAddress] = instruction | (targetAddress >> 8);
  }

  getAbsoluteAddressFromBlockOffset(blockIdx, offset) {
    const absoluteBlockAddress = this.#blocksRomOffsets.get(blockIdx);
    if (absoluteBlockAddress === undefined) {
      return null;
    }

    return absoluteBlockAddress + offset;
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
const checkPlacementVariant = (blocks, blocksRomOffsets, blocksPlacement) => {
  for (const blockIdx of blocksPlacement) {
    const callerBlockRomOffset = blocksRomOffsets.get(blockIdx);
    for (const { addressOffset, refBlockIdx, refInstructionOffset, isShort } of blocks[blockIdx].references) {
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
 * Returns placement for set of coupled blocks if it's present in cache
 */
const getCachedPlacementForCoupledBlocks = (placementCache, blocks, coupledBlockIndexes) => {
  const cacheSection = placementCache[coupledBlockIndexes.length];
  if (!cacheSection) {
    return null;
  }

  for (const cacheEntry of cacheSection) {
    const { coupledBlocks, offset: cachedOffset } = cacheEntry;
    const placement = new Array(coupledBlockIndexes.length);
    for (const blockIdx of coupledBlockIndexes) {
      const block = blocks[blockIdx];
      const similarCacheBlocks = coupledBlocks[`${block.references.length}, ${block.bytecode.length}`];
      const matchingCacheBlock = similarCacheBlocks?.find(
        ({ references: refs, placementPosition }) => (
          block.references.every((ref) => refs[`${ref.addressOffset}, ${ref.refInstructionOffset}`] === ref.isShort)
          && placement[placementPosition] === undefined
        ),
      );

      if (!matchingCacheBlock) {
        break;
      }

      placement[matchingCacheBlock.placementPosition] = blockIdx;
    }

    if (placement.includes(undefined)) {
      continue;
    }

    cacheEntry.inUse = true;
    return { placement, offset: cachedOffset };
  }

  return null;
};

/*
 * Update cache by known good placement
 */
const insertCachedPlacementForCoupledBlocks = (placementCache, blocks, pageOffset, placement) => {
  const cacheSection = placementCache[placement.length] || (placementCache[placement.length] = []);

  const coupledBlocks = {};
  for (const [placementPosition, blockIdx] of placement.entries()) {
    const { references, bytecode } = blocks[blockIdx];
    const key = `${references.length}, ${bytecode.length}`;
    (coupledBlocks[key] || (coupledBlocks[key] = [])).push({
      placementPosition,
      references: Object.fromEntries(
        references.map((ref) => [`${ref.addressOffset}, ${ref.refInstructionOffset}`, ref.isShort]),
      ),
    });
  }

  cacheSection.push({ coupledBlocks, offset: pageOffset, inUse: true });
};

/*
 * Append blocks to RAM, following provided placement
 */
const appendBlocksAccordingPlacement = (placement, blocks, romPages, sourceMap) => {
  for (const blockIdx of placement) {
    const block = blocks[blockIdx];
    const romAddress = romPages.appendBlock(block, blockIdx);
    for (const { instructionOffset, line } of block.sourceCodeLines) {
      sourceMap.push({ romOffset: romAddress + instructionOffset, line });
    }
  }
};

/*
 * Tries to place code block into ROM
 *
 * Returns true if it was possible to do
 *
 * Allows to use cache for block sets placements in format:
 *    {
 *      [coupledBlocks.length]: [
 *        {
 *          coupledBlocks: {
 *            [block.references.length, blockSize]: [
 *              { placementPosition, references: { [addressOffset, refInstructionOffset]: isShort } },
 *            ],
 *          },
 *          offset,
 *        },
 *      ]
 *    }
 */
const placeCodeBlock = (blocks, attemptedBlockIdx, romPages, sourceMap, placementCache) => {
  const pageOffset = romPages.usedSpaceInPage;
  const coupledBlocks = getCoupledBlocksIndexes(blocks, attemptedBlockIdx);
  if (placementCache && coupledBlocks.length >= MINIMAL_BLOCKS_SET_TO_CACHE) {
    const cachedPlacement = getCachedPlacementForCoupledBlocks(placementCache, blocks, coupledBlocks);
    if (cachedPlacement) {
      if (cachedPlacement.offset !== pageOffset) {
        return false;
      }
      appendBlocksAccordingPlacement(cachedPlacement.placement, blocks, romPages, sourceMap);
      return true;
    }
  }

  const queue = [{ prefix: [], suffix: coupledBlocks }];
  while (queue.length) {
    const { prefix, suffix } = queue.pop();
    if (!suffix.length) {
      const blocksRelativeRomOffsets = new Map();
      const blocksPlacement = prefix;

      let offset = pageOffset;
      for (const blockIdx of blocksPlacement) {
        blocksRelativeRomOffsets.set(blockIdx, offset);
        offset += blocks[blockIdx].bytecode.length;
      }

      if (!checkPlacementVariant(blocks, blocksRelativeRomOffsets, blocksPlacement)) {
        continue;
      }

      if (placementCache && coupledBlocks.length >= MINIMAL_BLOCKS_SET_TO_CACHE) {
        insertCachedPlacementForCoupledBlocks(placementCache, blocks, pageOffset, blocksPlacement);
      }
      appendBlocksAccordingPlacement(blocksPlacement, blocks, romPages, sourceMap);
      return true;
    }

    for (const [elementIdx, nextElementForPrefix] of suffix.entries()) {
      queue.push({ prefix: [...prefix, nextElementForPrefix], suffix: suffix.filter((_, idx) => elementIdx !== idx) });
    }
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
const fillRomWithBlocks = (blocks, sortedPrimaryBlocks, romPages, sourceMap, placementCache) => {
  while (sortedPrimaryBlocks.size) {
    let hasAnyCodeBlockFit = false;
    for (const codeBlock of sortedPrimaryBlocks) {
      if (placeCodeBlock(blocks, codeBlock.idx, romPages, sourceMap, placementCache)) {
        sortedPrimaryBlocks.delete(codeBlock);
        hasAnyCodeBlockFit = true;
        break;
      }
    }

    if (!hasAnyCodeBlockFit) {
      romPages.addSingleBytePadding();
    }
  }

  if (placementCache) {
    const updatedPlacementCache = Object.fromEntries(
      Object.entries(placementCache)
        .map(([key, section]) => [key, section.filter(({ inUse }) => inUse).map(({ inUse, ...rest }) => rest)])
        .filter(([, section]) => section.length),
    );

    return { placementCache: updatedPlacementCache };
  }

  return { placementCache: null };
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
 * Returns { rom, sourceMap, symbols }
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
export function buildRom(codeBlocks, blockAddressedSymbols, { placementCache: cache } = {}) {
  const sourceMap = [];
  const romPages = new RomPages();

  fillRomWithFixedBlocks(codeBlocks, romPages, sourceMap);
  const primaryBlocks = getSortedPrimaryBlocks(codeBlocks);
  const { placementCache: newCache } = fillRomWithBlocks(codeBlocks, primaryBlocks, romPages, sourceMap, cache);
  updateAddressesInBytecode(codeBlocks, romPages);

  return {
    placementCache: newCache,
    sourceMap,
    rom: romPages.rom,
    romSize: romPages.romSize,
    symbols: blockAddressedSymbols
      .map(
        ({ label, blockIdx, instructionOffset }) => ({
          label,
          romAddress: romPages.getAbsoluteAddressFromBlockOffset(blockIdx, instructionOffset),
        }),
      )
      .filter(({ romAddress }) => romAddress !== null),
  };
}
