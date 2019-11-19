import { toHex } from './string.js';

export const formatIOLogEntry = ({ type, address, data }) => `[${type}] Output at address ${address} has been set to 0x${toHex(data)}`;
