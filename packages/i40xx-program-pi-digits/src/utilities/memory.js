const writeValueToChars = (value, charsStorage, bytesToWrite) => {
  for (let idx = 0; idx < bytesToWrite; idx++) {
    charsStorage[idx] = value[idx] || 0x00;
  }
};

/*
 * Supports two format of memory representation - RAM dump and internal format of RAM from emulator
 */
const getRegister = (memory, bankIdx, regIdx) => (memory[bankIdx].registers || memory[bankIdx])[regIdx];

/*
 * Writes bytes into main characters of specified RAM register
 */
export const writeValueToMainChars = (value, memory, regIdx, bankIdx = 0) => (
  writeValueToChars(value, getRegister(memory, bankIdx, regIdx).main, 16)
);

/*
 * Writes bytes into main characters of specified RAM register
 */
export const writeValueToStatusChars = (value, memory, regIdx, bankIdx = 0) => (
  writeValueToChars(value, getRegister(memory, bankIdx, regIdx).status, 4)
);