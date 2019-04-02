import { BUILD_AND_RUN } from '../constants.js';

export default sourceCode => ({ type: BUILD_AND_RUN, payload: sourceCode });
