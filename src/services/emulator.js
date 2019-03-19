import store from '../redux/store.js';
import startConfiguration from '../redux/actions/startConfiguration.js';
import finishConfiguration from '../redux/actions/finishConfiguration.js';

const worker = new Worker('../workers/emulator/emulator.js');

worker.onmessage = ({ data: { command, error } }) => {
  if (command === 'configure')
    store.dispatch(finishConfiguration(error));
};

const configure = configuration => {
  store.dispatch(startConfiguration());
  worker.postMessage({ command: 'configure', configuration });
};

export { configure };
