import { getStore } from '../redux/store.js';
import updateEmulatorState from '../redux/actions/updateEmulatorState.js';
import addEmulatorIOLogEntry from '../redux/actions/addEmulatorIOLogEntry.js';
import clearIOState from '../redux/actions/clearIOState.js';

const worker = new Worker(new URL('../workers/emulator/emulator.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { command, error, ...rest } }) => {
  if (error) {
    getStore().dispatch(updateEmulatorState({ error, running: false }));
    return;
  }

  switch (command) {
    case 'finish':
      getStore().dispatch(updateEmulatorState({ running: false }));
      break;
    case 'IOOutput':
      getStore().dispatch(addEmulatorIOLogEntry(rest));
      break;
    case 'state':
      getStore().dispatch(updateEmulatorState(rest));
      break;
    default:
      break;
  }
};

const run = (dump, mode = 'run', ramDump = null) => {
  getStore().dispatch(updateEmulatorState({ error: '', mode, running: true }));
  getStore().dispatch(clearIOState());
  worker.postMessage({ command: 'run', dump, mode, ramDump });
};

const stop = () => {
  worker.postMessage({ command: 'stop' });
};

const stepInto = () => {
  worker.postMessage({ command: 'stepInto' });
};

const stepOver = () => {
  worker.postMessage({ command: 'stepOver' });
};

const setBreakpoints = (breakpoints) => {
  worker.postMessage({ breakpoints, command: 'breakpoints' });
};

const continueExec = () => {
  worker.postMessage({ command: 'continue' });
};

export { run, stop, stepInto, stepOver, setBreakpoints, continueExec };
