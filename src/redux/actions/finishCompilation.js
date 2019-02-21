import { FINISH_COMPILATION } from '../constants.js';

export default dump => ({
  type: FINISH_COMPILATION,
  payload: { dump }
});
