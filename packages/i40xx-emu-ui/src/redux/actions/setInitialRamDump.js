import { SET_INITIAL_RAM_DUMP } from '../constants.js';

export default (ramDump) => ({ payload: ramDump, type: SET_INITIAL_RAM_DUMP });
