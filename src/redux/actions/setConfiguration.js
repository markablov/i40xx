import { SET_CONFIGURATION } from '../constants.js';

export default configuration => ({
  type: SET_CONFIGURATION,
  payload: configuration
});
