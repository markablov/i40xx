import { UPDATE_EMULATOR_STATE } from '../constants.js';

export default state => ({
  type: UPDATE_EMULATOR_STATE,
  payload: state
});
