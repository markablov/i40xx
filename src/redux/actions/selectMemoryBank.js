import { SELECT_MEMORY_BANK } from '../constants.js';

export default bankNo => ({
  type: SELECT_MEMORY_BANK,
  payload: bankNo
});
