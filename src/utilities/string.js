export const pad = (str, padSize) => ('0'.repeat(padSize) + (str || '').toString()).slice(-padSize);
