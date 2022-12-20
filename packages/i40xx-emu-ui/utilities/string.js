export const toHex = (str) => (str == null ? '' : str).toString(16).toUpperCase();

export const pad = (str, padSize) => ('0'.repeat(padSize) + (str || '').toString()).slice(-padSize);

export const padHex = (str, padSize) => pad(toHex(str), padSize);
