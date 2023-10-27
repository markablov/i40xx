/* eslint-disable no-console, max-classes-per-file */

const MINIMAL_BLOCKS_SET_TO_CACHE = 3;
const ROM_BANK_COUNT = 2;

class RomBankSizeError extends Error {}
class RomBankOrderError extends Error {}

const RomBank = class RomBank {
  static ROM_PAGES_COUNT = 0x10;

  static BYTES_PER_ROM_PAGE = 0x100;

  static getAbsoluteAddress(page, offset) {
    return page * RomBank.BYTES_PER_ROM_PAGE + offset;
  }

  static getPageFromAddress(address) {
    return Math.trunc(address / RomBank.BYTES_PER_ROM_PAGE);
  }

  static getPageOffsetFromAddress(address) {
    return address % RomBank.BYTES_PER_ROM_PAGE;
  }

  #currentPage = 0;

  #currentPageOffset = 0;

  #pages = [];

  #blocksRomOffsets = new Map();

  #bankNo;

  constructor(bankNo) {
    this.#pages = Array.from(new Array(RomBank.ROM_PAGES_COUNT), () => (new Uint8Array(RomBank.BYTES_PER_ROM_PAGE)));
    this.#bankNo = bankNo;
  }

  goToNextPage() {
    this.#currentPage++;
    this.#currentPageOffset = 0;
    if (this.#currentPage >= RomBank.ROM_PAGES_COUNT) {
      throw new RomBankSizeError(`Couldn't fit all codeblocks into ROM bank ${this.#bankNo}!`);
    }
  }

  addSingleBytePadding() {
    this.#currentPageOffset++;
    if (this.#currentPageOffset === RomBank.BYTES_PER_ROM_PAGE) {
      this.goToNextPage();
    }
  }

  /*
   * Insert block to specific position without updating cursor
   */
  putBlock(block, page, offset) {
    const absoluteAddress = RomBank.getAbsoluteAddress(page, offset);
    this.#blocksRomOffsets.set(block.id, absoluteAddress);
    block.actualBanksPlacement.add(this.#bankNo);
    this.#pages[page].set(block.bytecode, offset);
  }

  /*
   * Append block to ROM and advance cursor
   */
  appendBlock(block, page, offset) {
    if (page !== undefined && offset !== undefined) {
      if (page < this.#currentPage) {
        throw new RomBankOrderError('Wrong order of blocks to append to ROM!');
      }

      if (page === this.#currentPage && offset < this.#currentPageOffset) {
        throw new RomBankOrderError('Wrong order of blocks to append to ROM!');
      }

      this.#currentPage = page;
      this.#currentPageOffset = offset;
    }

    const absoluteAddress = RomBank.getAbsoluteAddress(this.#currentPage, this.#currentPageOffset);
    this.#blocksRomOffsets.set(block.id, absoluteAddress);
    block.actualBanksPlacement.add(this.#bankNo);

    const blockSize = block.bytecode.length;
    const freeSpaceInCurrentPage = RomBank.BYTES_PER_ROM_PAGE - this.#currentPageOffset;
    if (freeSpaceInCurrentPage > blockSize) {
      this.#pages[this.#currentPage].set(block.bytecode, this.#currentPageOffset);
      this.#currentPageOffset += blockSize;
      return;
    }

    this.#pages[this.#currentPage].set(block.bytecode.slice(0, freeSpaceInCurrentPage), this.#currentPageOffset);
    this.goToNextPage();

    let blockOffset = freeSpaceInCurrentPage;
    while (blockOffset < blockSize) {
      const bytesLeft = blockSize - blockOffset;
      if (bytesLeft >= RomBank.BYTES_PER_ROM_PAGE) {
        const currentBytecodeChunk = block.bytecode.slice(blockOffset, blockOffset + RomBank.BYTES_PER_ROM_PAGE);
        this.#pages[this.#currentPage].set(currentBytecodeChunk, 0);
        this.goToNextPage();
        blockOffset += RomBank.BYTES_PER_ROM_PAGE;
        continue;
      }

      this.#pages[this.#currentPage].set(block.bytecode.slice(blockOffset), 0);
      this.#currentPageOffset = bytesLeft;
      return;
    }
  }

  /*
   * Updates encoded address in bytecode
   *
   * For short jumps, 2nd byte of instruction is updated, for long jumps we also modify 1st byte of instruction to
   *   include highest 4bit of address.
   */
  updateEncodedAddress(absoluteAddressOffset, absoluteTargetOffset, isShort) {
    const pageWithLowPartOfAddress = this.#pages[RomBank.getPageFromAddress(absoluteAddressOffset)];
    const pageOffsetWithLowPartOfAddress = RomBank.getPageOffsetFromAddress(absoluteAddressOffset);
    pageWithLowPartOfAddress[pageOffsetWithLowPartOfAddress] = absoluteTargetOffset & 0xFF;
    if (isShort) {
      return;
    }

    // to handle cases when instruction placed at XX:0xFF location, we need to re-evaluate page number and offsets
    const pageWithHighPartOfAddress = this.#pages[RomBank.getPageFromAddress(absoluteAddressOffset - 1)];
    const pageOffsetWithHighPartOfAddress = RomBank.getPageOffsetFromAddress(absoluteAddressOffset - 1);
    const instruction = pageWithHighPartOfAddress[pageOffsetWithHighPartOfAddress];
    pageWithHighPartOfAddress[pageOffsetWithHighPartOfAddress] = instruction | (absoluteTargetOffset >> 8);
  }

  get blockOffsets() {
    return this.#blocksRomOffsets;
  }

  get usedSpaceInPage() {
    return this.#currentPageOffset;
  }

  get rom() {
    return Uint8Array.from(Array.prototype.concat(...this.#pages.map((page) => Array.from(page))));
  }

  get romSize() {
    return this.#currentPage * RomBank.BYTES_PER_ROM_PAGE + this.#currentPageOffset;
  }

  get bankNo() {
    return this.#bankNo;
  }
};

/*
 * Checks if placement variant satisfies short calls limitations:
 *  - caller instruction should not be at last two words on the ROM page
 *  - caller instruction and callee block first instruction should be on the same ROM page
 */
const checkPlacementVariant = (blocks, blocksRomOffsets, blocksPlacement) => {
  for (const blockId of blocksPlacement) {
    const callerBlockRomOffset = blocksRomOffsets.get(blockId);
    for (const { addressOffset, refBlockId, refInstructionOffset, isShort } of blocks[blockId].references) {
      if (!isShort) {
        continue;
      }

      const absoluteOffset = callerBlockRomOffset + (addressOffset - 1);
      if ((absoluteOffset % RomBank.BYTES_PER_ROM_PAGE) >= (RomBank.BYTES_PER_ROM_PAGE - 2)) {
        return false;
      }

      const callerRomPage = RomBank.getPageFromAddress(absoluteOffset);
      const calleeRomPage = RomBank.getPageFromAddress(blocksRomOffsets.get(refBlockId) + refInstructionOffset);
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
const getCoupledBlocksIds = (blocks, firstBlockId) => {
  const coupledBlocks = new Set();
  const blocksToAdd = [firstBlockId];

  while (blocksToAdd.length) {
    const blockId = blocksToAdd.shift();
    if (coupledBlocks.has(blockId)) {
      continue;
    }

    coupledBlocks.add(blockId);
    blocksToAdd.push(...blocks[blockId].references.filter((block) => block.isShort).map((block) => block.refBlockId));
  }

  return [...coupledBlocks];
};

/*
 * Returns placement for set of coupled blocks if it's present in cache
 */
const getCachedPlacementForCoupledBlocks = (placementCache, blocks, coupledBlockIds) => {
  const cacheSection = placementCache[coupledBlockIds.length];
  if (!cacheSection) {
    return null;
  }

  for (const cacheEntry of cacheSection) {
    const { coupledBlocks, offset: cachedOffset } = cacheEntry;
    const placement = new Array(coupledBlockIds.length);
    for (const blockId of coupledBlockIds) {
      const block = blocks[blockId];
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

      placement[matchingCacheBlock.placementPosition] = blockId;
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
  for (const [placementPosition, blockId] of placement.entries()) {
    const { references, bytecode } = blocks[blockId];
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
const placeCodeBlock = (blocks, attemptedBlockId, romBank, placementCache) => {
  if (romBank.blockOffsets.has(attemptedBlockId)) {
    return true;
  }

  const pageOffset = romBank.usedSpaceInPage;
  const coupledBlocks = getCoupledBlocksIds(blocks, attemptedBlockId);
  if (placementCache && coupledBlocks.length >= MINIMAL_BLOCKS_SET_TO_CACHE) {
    const cachedPlacement = getCachedPlacementForCoupledBlocks(placementCache, blocks, coupledBlocks);
    if (cachedPlacement?.offset === pageOffset) {
      for (const blockId of cachedPlacement.placement) {
        romBank.appendBlock(blocks[blockId]);
      }
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
      for (const blockId of blocksPlacement) {
        blocksRelativeRomOffsets.set(blockId, offset);
        offset += blocks[blockId].bytecode.length;
      }

      if (!checkPlacementVariant(blocks, blocksRelativeRomOffsets, blocksPlacement)) {
        continue;
      }

      if (placementCache && coupledBlocks.length >= MINIMAL_BLOCKS_SET_TO_CACHE) {
        insertCachedPlacementForCoupledBlocks(placementCache, blocks, pageOffset, blocksPlacement);
      }

      for (const blockId of blocksPlacement) {
        romBank.appendBlock(blocks[blockId]);
      }
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
const getFullBlockSize = (blocks, primaryBlockId) => {
  const blocksChecked = new Set([]);
  const blocksQueue = [primaryBlockId];

  let sum = 0;
  while (blocksQueue.length) {
    const blockId = blocksQueue.shift();
    if (blocksChecked.has(blockId)) {
      continue;
    }

    const { bytecode, references } = blocks[blockId];
    sum += bytecode.length;
    blocksQueue.push(...references.filter(({ isShort }) => isShort).map(({ refBlockId }) => refBlockId));
    blocksChecked.add(blockId);
  }

  return sum;
};

/*
 * Try to place specific set of code blocks into ROM in some kind of optimal manner
 */
const fillRomWithBlocksFromSet = (blocksToPlace, blocks, romBank, placementCache) => {
  while (blocksToPlace.size) {
    let hasAnyCodeBlockFit = false;
    for (const codeBlock of blocksToPlace) {
      if (placeCodeBlock(blocks, codeBlock.id, romBank, placementCache)) {
        blocksToPlace.delete(codeBlock);
        hasAnyCodeBlockFit = true;
        break;
      }
    }

    if (!hasAnyCodeBlockFit) {
      romBank.addSingleBytePadding();
    }
  }
};

/*
 * Try to place all code blocks into ROM in some kind of optimal manner
 */
const fillRomWithBlocks = (primaryBlocks, blocks, romBank, placementCache) => {
  fillRomWithBlocksFromSet(primaryBlocks, blocks, romBank, placementCache);

  // It could be situation:
  //   1. block A has long reference to block B
  //   2. block B has short reference to block C
  //   3. block C has short reference to block B
  // B and C would be marked as dependant, so they would not be included in primary blocks
  // but because A has long reference to B, then B would not be part of dependency tree for A
  // it means that blocks B and C would not be processed
  const unplacedBlocks = blocks.filter(
    (block) => block.desiredBanksPlacement.has(romBank.bankNo) && !block.actualBanksPlacement.has(romBank.bankNo),
  );
  fillRomWithBlocksFromSet(new Set(unplacedBlocks), blocks, romBank, placementCache);

  if (placementCache) {
    for (const sectionName of Object.keys(placementCache)) {
      const updatedSection = placementCache[sectionName].filter(({ inUse }) => inUse).map(({ inUse, ...rest }) => rest);
      if (!updatedSection.length) {
        delete placementCache[sectionName];
        continue;
      }

      placementCache[sectionName] = updatedSection;
    }
  }
};

/*
 * Return Set with primary blocks, sorted by their sizes (including dependant blocks)
 */
const getSortedPrimaryBlocks = (romBlocks, blocks) => {
  const primaryCodeBlocks = romBlocks
    .map((block) => ({ ...block, fullSize: getFullBlockSize(blocks, block.id) }))
    .filter(({ isDependant, fixedLocation }) => !isDependant && !fixedLocation);

  return new Set(primaryCodeBlocks.sort((a, b) => b.fullSize - a.fullSize));
};

const getAbsoluteAddressForFixedBlock = ({ fixedLocation: { page, offset } }) => (
  RomBank.getAbsoluteAddress(page, offset)
);

/*
 * Places all code blocks, for which location is specified, into ROM
 */
const fillRomWithFixedBlocks = (fixedBlocks, romBank) => {
  for (const block of fixedBlocks) {
    romBank.appendBlock(block, block.fixedLocation.page, block.fixedLocation.offset);
  }
};

/*
 * Try to fill gaps between fixed blocks with small routines
 */
const fillGapsBetweenFixedBlocks = (fixedBlocks, primaryBlocks, blocks, romBank) => {
  for (const [idx, fixedBlock] of fixedBlocks.entries()) {
    const nextFixedBlock = fixedBlocks[idx + 1];
    if (!nextFixedBlock) {
      break;
    }

    const { page, offset } = fixedBlock.fixedLocation;

    // in theory, it's possible to put something between blocks from different pages
    if (nextFixedBlock.fixedLocation.page !== page) {
      continue;
    }

    const gapSize = nextFixedBlock.fixedLocation.offset - offset - fixedBlock.bytecode.length;
    for (const primaryBlock of primaryBlocks) {
      if (primaryBlock.fullSize > gapSize) {
        continue;
      }

      let pageOffset = offset + fixedBlock.bytecode.length;
      const coupledBlocks = getCoupledBlocksIds(blocks, primaryBlock.id);
      for (const blockId of coupledBlocks) {
        const block = blocks[blockId];
        romBank.putBlock(block, page, pageOffset);
        pageOffset += block.bytecode.length;
      }

      primaryBlocks.delete(primaryBlock);
      break;
    }
  }
};

/*
 * Place blocks into single rom bank
 */
const placeBlocksIntoRomBank = (romBank, blocks, bankNo, placementCache) => {
  const romBlocks = blocks.filter(({ desiredBanksPlacement }) => desiredBanksPlacement.has(bankNo));
  const primaryBlocks = getSortedPrimaryBlocks(romBlocks, blocks);
  const fixedBlocks = romBlocks
    .filter(({ fixedLocation }) => !!fixedLocation)
    .sort((a, b) => getAbsoluteAddressForFixedBlock(a) - getAbsoluteAddressForFixedBlock(b));

  fillRomWithFixedBlocks(fixedBlocks, romBank);
  fillGapsBetweenFixedBlocks(fixedBlocks, primaryBlocks, blocks, romBank);
  fillRomWithBlocks(primaryBlocks, blocks, romBank, placementCache);
};

/*
 * Set rom bank placement for all blocks, linked via references
 */
const assignRomBanks = (blocks, entrypointBlockId) => {
  const queue = [{ blockId: entrypointBlockId, bankNo: 0 }];
  while (queue.length) {
    const { blockId, bankNo } = queue.shift();
    const block = blocks[blockId];
    const bankToUse = block.fixedBank ?? bankNo;

    if (block.desiredBanksPlacement.has(bankToUse)) {
      continue;
    }

    block.desiredBanksPlacement.add(bankToUse);

    queue.push(...block.references.map(({ refBlockId }) => ({ blockId: refBlockId, bankNo: bankToUse })));
    if (block.fixedLocation) {
      const samePageBlocks = blocks.filter(
        ({ fixedLocation, id }) => fixedLocation?.page === block.fixedLocation.page && id !== entrypointBlockId,
      );

      queue.push(...samePageBlocks.map(({ id }) => ({ blockId: id, bankNo: bankToUse })));
    }
  }
};

const romAddressStr = (address) => address.toString(16).toUpperCase().padStart(3, '0');
const blockSizeStr = (size) => size.toString().padStart(3, ' ');

/*
 * Print information about block placement in rom page and non-placed blocks
 */
const printBlocksPlacementInfo = (codeBlocks, blockOffsets, symbolsPerBlock, bankNo) => {
  const gaps = [];

  console.log('Current blocks placement:');
  const orderedBlockOffsets = [...blockOffsets.entries()].sort(([, a], [, b]) => a - b);
  for (const [idx, [blockId, romAddress]] of orderedBlockOffsets.slice(0, -1).entries()) {
    const blockLabel = symbolsPerBlock.get(blockId).find(({ instructionOffset }) => !instructionOffset).label;
    console.log(`  [${romAddressStr(romAddress)}, ${blockSizeStr(codeBlocks[blockId].bytecode.length)}] ${blockLabel}`);

    const endOfBlock = romAddress + codeBlocks[blockId].bytecode.length;
    if (orderedBlockOffsets[idx + 1] && orderedBlockOffsets[idx + 1][1] !== endOfBlock) {
      const gap = orderedBlockOffsets[idx + 1][1] - endOfBlock;
      console.log(`  [${romAddressStr(endOfBlock)}, ${blockSizeStr(gap)}] FREE`);
      gaps.push(gap);
    }
  }

  console.log();
  console.log(`Free space left in ROM: ${gaps.reduce((sum, gap) => sum + gap, 0)} bytes`);
  console.log(`Maximum gap between blocks: ${Math.max(...gaps)} bytes`);

  console.log();
  console.log('Non-placed blocks:');
  let totalSizeOfNonPlacedBlocks = 0;
  const [lastBlockId] = orderedBlockOffsets.at(-1);
  const placedBlocks = new Set(orderedBlockOffsets.map(([blockId]) => blockId).filter((id) => id !== lastBlockId));
  for (const { desiredBanksPlacement, id, bytecode: { length: blockSize } } of codeBlocks) {
    if (desiredBanksPlacement.has(bankNo) && !placedBlocks.has(id)) {
      const blockLabel = symbolsPerBlock.get(id).find(({ instructionOffset }) => !instructionOffset).label;
      console.log(`  [${blockSize}] ${blockLabel}`);
      totalSizeOfNonPlacedBlocks += blockSize;
    }
  }
  console.log(`Size of non-placed blocks: ${totalSizeOfNonPlacedBlocks} bytes`);
  console.log();
};

/*
 * Returns { roms: [{ data, size, sourceMap, symbols }], placementCache }
 *
 * Expects code blocks in format:
 * {
 *   id,
 *   bytecode,
 *   sourceCodeLines: [{ instructionOffset, line }],
 *   references: [{ addressOffset, refBlockId, refInstructionOffset, isShort }],
 *   isDependant,
 *   fixedLocation: { page, offset },
 *   fixedBank,
 * }
 */
export function buildRom(codeBlocks, blockAddressedSymbols, { placementCache } = {}) {
  const symbolsPerBlock = new Map();
  for (const { label, blockId, instructionOffset } of blockAddressedSymbols) {
    if (!symbolsPerBlock.has(blockId)) {
      symbolsPerBlock.set(blockId, []);
    }
    symbolsPerBlock.get(blockId).push({ label, instructionOffset });
  }

  for (const block of codeBlocks) {
    block.desiredBanksPlacement = new Set();
    block.actualBanksPlacement = new Set();
  }

  assignRomBanks(
    codeBlocks,
    codeBlocks.find(({ fixedLocation }) => fixedLocation?.page === 0 && fixedLocation?.offset === 0).id,
  );

  const romBanks = Array.from(new Array(ROM_BANK_COUNT), (_, idx) => new RomBank(idx));
  for (const [bankNo, romBank] of romBanks.entries()) {
    try {
      placeBlocksIntoRomBank(romBank, codeBlocks, bankNo, placementCache);
    } catch (err) {
      if (err instanceof RomBankSizeError) {
        printBlocksPlacementInfo(codeBlocks, romBank.blockOffsets, symbolsPerBlock, bankNo);
      }
      throw err;
    }
  }

  const roms = romBanks.map((romBank, bankNo) => {
    const symbols = [];
    const sourceMap = [];

    for (const [blockId, romAddress] of romBank.blockOffsets.entries()) {
      const block = codeBlocks[blockId];

      for (const { instructionOffset, line } of block.sourceCodeLines) {
        sourceMap.push({ romOffset: romAddress + instructionOffset, line });
      }

      for (const { instructionOffset, label } of (symbolsPerBlock.get(blockId) || [])) {
        symbols.push({ label, romAddress: romAddress + instructionOffset });
      }

      for (const { addressOffset, refBlockId, refInstructionOffset, isShort } of block.references) {
        const { desiredBanksPlacement } = codeBlocks[refBlockId];
        const refBankNo = desiredBanksPlacement.has(bankNo) ? bankNo : [...desiredBanksPlacement][0];
        const targetBlockAddress = romBanks[refBankNo].blockOffsets.get(refBlockId);
        if (targetBlockAddress === undefined) {
          throw Error('Broken reference! Something went wrong internally...');
        }
        romBank.updateEncodedAddress(romAddress + addressOffset, targetBlockAddress + refInstructionOffset, isShort);
      }
    }

    return {
      symbols,
      sourceMap,
      data: romBank.rom,
      size: romBank.romSize,
    };
  });

  return { roms, placementCache };
}
