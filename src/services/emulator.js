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

const run = dump => {
  store.dispatch(updateEmulatorState({ running: true, error: '' }));
  worker.postMessage({ command: 'run', mode: 'run', dump });
};

export { run };
