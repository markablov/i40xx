import store from '../redux/store.js';
import startCompilation from '../redux/actions/startCompilation.js';

const worker = new Worker('../workers/compiler/compiler.js');

worker.onmessage = () => {
};

const compile = sourceCode => {
  store.dispatch(startCompilation());
  worker.postMessage(sourceCode);
};

export { compile };
