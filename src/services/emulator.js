import store from '../redux/store.js';
import updateEmulatorState from '../redux/actions/updateEmulatorState.js';

const worker = new Worker('../workers/emulator/emulator.js');

worker.onmessage = ({ data: { command, error, ...rest } }) => {
  if (error)
    return store.dispatch(updateEmulatorState({ error, running: false }));

  switch (command) {
    case 'finish':
      return store.dispatch(updateEmulatorState({ running: false }));
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

const step = () => {
  worker.postMessage({ command: 'step' });
};

const setBreakpoints = breakpoints => {
  worker.postMessage({ command: 'breakpoints', breakpoints });
};

const continueExec = () => {
  worker.postMessage({ command: 'continue' });
};

export { run, stop, step, setBreakpoints, continueExec };
