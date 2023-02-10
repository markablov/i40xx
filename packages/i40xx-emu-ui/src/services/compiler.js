import compilerStore from '../stores/compilerStore.js';

const worker = new Worker(new URL('../workers/compiler/compiler.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { dump, errors, sourceMap } }) => {
  const sourceCodeLineByRomOffsetMap = new Map();
  const romOffsetBySourceCodeMap = new Map();

  for (const { line, romOffset } of sourceMap) {
    sourceCodeLineByRomOffsetMap.set(romOffset, line);
    romOffsetBySourceCodeMap.set(line, romOffset);
  }

  compilerStore.update((state) => {
    state.isCompiling = false;
    state.errors = errors;
    state.romDump = dump;
    state.sourceCodeLineByRomOffsetMap = sourceCodeLineByRomOffsetMap;
    state.romOffsetBySourceCodeMap = romOffsetBySourceCodeMap;
  });
};

export default function compile(sourceCode) {
  compilerStore.update((state) => {
    state.isCompiling = true;
    state.errors = [];
    state.romDump = null;
    state.sourceCodeLineByRomOffsetMap = new Map();
    state.romOffsetBySourceCodeMap = new Map();
  });

  worker.postMessage(sourceCode);
}
