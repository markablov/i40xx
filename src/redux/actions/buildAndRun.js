import { BUILD_AND_RUN } from '../constants.js';

export default (sourceCode, mode) => ({ payload: { mode, sourceCode }, type: BUILD_AND_RUN });
