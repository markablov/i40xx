import { UPDATE_EMULATOR_STATE } from '../constants.js';

export default (state) => ({
  payload: state,
  type: UPDATE_EMULATOR_STATE,
});
