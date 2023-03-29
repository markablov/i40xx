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

export const VARIABLES = Object.freeze({
  STATUS_MEM_VARIABLE_F_COMPUTATION_K: 0x4,
  STATUS_MEM_VARIABLE_MODULUS_INV: 0x5,
  STATUS_MEM_VARIABLE_V: 0x6,
  STATUS_MEM_VARIABLE_F_COMPUTATION_A: 0x7,
  STATUS_MEM_VARIABLE_CURRENT_PRIME: 0x9,
  STATUS_MEM_VARIABLE_F: 0xB,
  STATUS_MEM_VARIABLE_MODULUS: 0xD,
  STATUS_MEM_VARIABLE_N: 0xE,
  STATUS_MEM_VARIABLE_F_COMPUTATION_B: 0xF,

  MAIN_MEM_VARIABLE_DIV_DIVISOR: 0x9,
});
