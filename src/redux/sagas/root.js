import { takeLatest, take, select } from 'redux-saga/effects';

import * as Actions from '../constants.js';
import { compile } from '../../services/compiler.js';
import { run } from '../../services/emulator.js';

function* buildAndRun({ payload: { sourceCode, mode } }) {
  compile(sourceCode);

  const { payload: { dump, errors } } = yield take(Actions.FINISH_COMPILATION);
  if (errors && errors.length)
    return;

  run(dump, mode);

  const { editor } = yield select();
  editor.focus();
}

function* rootSaga() {
  yield takeLatest(Actions.BUILD_AND_RUN, buildAndRun);
}

export default rootSaga;
