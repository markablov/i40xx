import store from '../redux/store.js';
import updateEmulatorState from '../redux/actions/updateEmulatorState.js';
import addEmulatorIOLogEntry from '../redux/actions/addEmulatorIOLogEntry.js';

const worker = new Worker(new URL('../workers/emulator/emulator.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { command, error, ...rest } }) => {
  if (error)
    return store.dispatch(updateEmulatorState({ error, running: false }));

  switch (command) {
    case 'finish':
      return store.dispatch(updateEmulatorState({ running: false }));
    case 'IOOutput':
      return store.dispatch(addEmulatorIOLogEntry(rest));
    case 'state':
      return store.dispatch(updateEmulatorState(rest));
  }
};

const run = (dump, mode = 'run') => {
  store.dispatch(updateEmulatorState({ running: true, error: '', mode }));
  worker.postMessage({ command: 'run', mode, dump });
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

const setBreakpoints = breakpoints => {
  worker.postMessage({ command: 'breakpoints', breakpoints });
};

const continueExec = () => {
  worker.postMessage({ command: 'continue' });
};

export { run, stop, stepInto, stepOver, setBreakpoints, continueExec };
