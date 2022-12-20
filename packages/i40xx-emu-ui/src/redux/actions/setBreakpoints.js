import { SET_BREAKPOINTS } from '../constants.js';
import { setBreakpoints } from '../../services/emulator.js';

export default (breakpoints) => {
  setBreakpoints(breakpoints);

  return ({
    payload: breakpoints,
    type: SET_BREAKPOINTS,
  });
};
