import { FINISH_COMPILATION } from '../constants.js';

export default (dump, errors, sourceMap) => ({
  payload: { dump, errors, sourceMap },
  type: FINISH_COMPILATION,
});
