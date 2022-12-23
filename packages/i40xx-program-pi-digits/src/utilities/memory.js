const writeValueToChars = (value, charsStorage) => {
  for (const [idx, byte] of Object.entries(value)) {
    charsStorage[idx] = byte;
  }
};

/*
 * Writes bytes into main characters of specified RAM register
 */
export const writeValueToMainChars = (value, memory, regIdx) => (
  writeValueToChars(value, memory[0].registers[regIdx].main)
);

/*
 * Writes bytes into main characters of specified RAM register
 */
export const writeValueToStatusChars = (value, memory, regIdx) => (
  writeValueToChars(value, memory[0].registers[regIdx].status)
);
