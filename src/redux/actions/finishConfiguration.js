import { FINISH_CONFIGURATION } from '../constants.js';

export default error => ({
  type: FINISH_CONFIGURATION,
  payload: { error }
});
