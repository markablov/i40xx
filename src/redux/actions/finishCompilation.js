import { FINISH_COMPILATION } from '../constants.js';

export default (dump, errors) => ({
  type: FINISH_COMPILATION,
  payload: { dump, errors }
});
