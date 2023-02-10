import { Store } from 'pullstate';

export default new Store({
  errors: [],
  isCompiling: false,
  romDump: null,
  romOffsetBySourceCodeMap: new Map(),
  sourceCodeLineByRomOffsetMap: new Map(),
});
