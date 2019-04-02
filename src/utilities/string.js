export const pad = (str, padSize) => ('0'.repeat(padSize) + (str || '').toString()).slice(-padSize);

export const padHex = (str, padSize) => pad((str || '').toString(16).toUpperCase(), padSize);
