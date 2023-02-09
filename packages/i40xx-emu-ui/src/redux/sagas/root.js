import { takeLatest, take } from 'redux-saga/effects';

import * as Actions from '../constants.js';
import compile from '../../services/compiler.js';
import { run } from '../../services/emulator.js';
import editorStore from '../../stores/editorStore.js';
import emulatorStore from '../../stores/emulatorStore.js';

function* buildAndRun({ payload: { mode, sourceCode } }) {
  compile(sourceCode);

  const { payload: { dump, errors } } = yield take(Actions.FINISH_COMPILATION);
  if (errors && errors.length) {
    return;
  }

  run(dump, mode, emulatorStore.getRawState().initialRAM);

  editorStore.getRawState().editor.focus();
}

function* rootSaga() {
  yield takeLatest(Actions.BUILD_AND_RUN, buildAndRun);
}

export default rootSaga;
