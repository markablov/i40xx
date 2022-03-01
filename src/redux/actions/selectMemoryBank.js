import { SELECT_MEMORY_BANK } from '../constants.js';

export default (bankNo) => ({
  payload: bankNo,
  type: SELECT_MEMORY_BANK,
});
