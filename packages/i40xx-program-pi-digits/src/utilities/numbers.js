/*
 * Converts number stored inside RAM register to hex string
 *
 * Data is stored as little-endian numbers [least significant digit, ..., most significant digit]
 */
export const hwNumberToHex = (chars) => (
  `0x${
    [...chars].reverse()
      .map((char) => char.toString(16))
      .join('')
      .replaceAll(/^0+(?!$)/g, '')
      .toUpperCase()
  }`
);

/*
 * Converts number stored inside RAM register to regular number
 *
 * Data is stored as little-endian numbers [least significant digit, ..., most significant digit]
 */
export const hwNumberToNum = (chars) => (
  parseInt([...chars].reverse().map((char) => char.toString(16)).join(''), 16)
);

/*
 * Convert hexadecimal string to array of digits, that could be stored inside RAM register
 *
 * Data is stored as little-endian numbers [least significant digit, ..., most significant digit]
 */
export const hexToHWNumber = (hex) => (
  hex.substring(2).split('').reverse().map((char) => parseInt(char, 16))
);

/*
 * Convert number to array of digits, that could be stored inside RAM register
 *
 * Data is stored as little-endian numbers [least significant digit, ..., most significant digit]
 */
export const numToHWNumber = (num) => (
  num.toString(16).split('').reverse().map((char) => parseInt(char, 16))
);
