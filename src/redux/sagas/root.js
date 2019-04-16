import { takeLatest, take } from 'redux-saga/effects';

import * as Actions from '../constants.js';
import { compile } from '../../services/compiler.js';
import { run } from '../../services/emulator.js';

function* buildAndRun({ payload: { sourceCode, mode } }) {
  compile(sourceCode);

  const { payload: { dump, errors } } = yield take(Actions.FINISH_COMPILATION);
  if (errors && errors.length)
    return;

  run(dump, mode);
}

function* rootSaga() {
  yield takeLatest(Actions.BUILD_AND_RUN, buildAndRun);
}

export default rootSaga;
