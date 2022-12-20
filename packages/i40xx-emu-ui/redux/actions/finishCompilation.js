import { FINISH_COMPILATION } from '../constants.js';

export default (dump, errors) => ({
  payload: { dump, errors },
  type: FINISH_COMPILATION,
});
