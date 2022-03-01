import { toHex } from './string.js';

export default ({ address, data, type }) => `[${type}] Output at address ${address} has been set to 0x${toHex(data)}`;
