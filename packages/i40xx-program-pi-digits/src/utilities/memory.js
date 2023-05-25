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
export const writeValueToMainChars = (value, memory, regIdx, bankIdx = 7) => (
  writeValueToChars(value, getRegister(memory, bankIdx, regIdx).main, 16)
);

/*
 * Writes bytes into main characters of specified RAM register
 */
export const writeValueToStatusChars = (value, memory, regIdx, bankIdx = 7) => (
  writeValueToChars(value, getRegister(memory, bankIdx, regIdx).status, 4)
);

export function getMemoryBankFromAbsoluteAddr(addr) {
  const bankNo = Math.floor(addr / 16);
  // when you are doing DCL 0x3, RAM bank 0x4 is selected and vice versa
  switch (bankNo) {
    case 3:
      return 4;
    case 4:
      return 3;
    default:
      return bankNo;
  }
}

export const VARIABLES = Object.freeze({
  STATUS_MEM_VARIABLE_POINTER_TO_PRIME_FROM_INITIAL_SEGMENT: 0x0,
  STATUS_MEM_VARIABLE_POINTER_TO_PRIMENESS_MAP_CELL: 0x0,
  STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG: 0x0,
  STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION: 0x1,
  STATUS_MEM_VARIABLE_MODULUS: 0x4,
  STATUS_MEM_VARIABLE_DOUBLED_N_NEG: 0x5,
  STATUS_MEM_VARIABLE_DIGITS_COUNT: 0x5,
  STATUS_MEM_VARIABLE_BASE_VALUE_FOR_PRIMENESS_MAP: 0x6,
  STATUS_MEM_VARIABLE_V: 0x6,
  STATUS_MEM_VARIABLE_MODULUS_NEG: 0x7,
  STATUS_MEM_VARIABLE_F_COMPUTATION_FK: 0x8,
  STATUS_MEM_VARIABLE_CURRENT_PRIME: 0x9,
  STATUS_MEM_VARIABLE_F: 0xB,
  STATUS_MEM_VARIABLE_F_COMPUTATION_A: 0xC,
  STATUS_MEM_VARIABLE_F_COMPUTATION_K: 0xD,
  STATUS_MEM_VARIABLE_N_NEG: 0xE,
  STATUS_MEM_VARIABLE_F_COMPUTATION_B: 0xF,

  MAIN_MEM_VARIABLE_PRIMENESS_MAP_START: 0x4,
  MAIN_MEM_VARIABLE_DIV_DIVISOR: 0x9,
  MAIN_MEM_VARIABLE_PRIME_SEGMENT_SIZE: 0xB,
  MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START: 0xC,
});
