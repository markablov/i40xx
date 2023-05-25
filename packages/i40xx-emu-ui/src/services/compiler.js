import compilerStore from '../stores/compilerStore.js';

const worker = new Worker(new URL('../workers/compiler/compiler.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { errors, roms } }) => {
  const romOffsetBySourceCodePerBank = [];
  const sourceCodeLineByRomOffsetPerBank = [];

  if (roms) {
    for (const { sourceMap } of roms) {
      const romOffsetBySourceCodeMap = new Map();
      const sourceCodeLineByRomOffsetMap = new Map();
      for (const { line, romOffset } of sourceMap) {
        romOffsetBySourceCodeMap.set(line, romOffset);
        sourceCodeLineByRomOffsetMap.set(romOffset, line);
      }
      romOffsetBySourceCodePerBank.push(romOffsetBySourceCodeMap);
      sourceCodeLineByRomOffsetPerBank.push(sourceCodeLineByRomOffsetMap);
    }
  }

  compilerStore.update((state) => {
    state.isCompiling = false;
    state.errors = errors;
    state.romDump = roms?.map(({ data }) => data);
    state.romOffsetBySourceCodePerBank = romOffsetBySourceCodePerBank;
    state.sourceCodeLineByRomOffsetPerBank = sourceCodeLineByRomOffsetPerBank;
  });
};

export default function compile(sourceCode) {
  compilerStore.update((state) => {
    state.isCompiling = true;
    state.errors = [];
    state.romDump = null;
    state.romOffsetBySourceCodePerBank = [];
    state.sourceCodeLineByRomOffsetPerBank = [];
  });

  worker.postMessage(sourceCode);
}
