import { BUILD_AND_RUN } from '../constants.js';

export default (sourceCode, mode) => ({ type: BUILD_AND_RUN, payload: { sourceCode, mode } });
