import store from '../redux/store.js';
import startCompilation from '../redux/actions/startCompilation.js';
import finishCompilation from '../redux/actions/finishCompilation.js';

const worker = new Worker('../workers/compiler/compiler.js');

worker.onmessage = ({ data: { dump } }) => {
  store.dispatch(finishCompilation(dump));
};

const compile = sourceCode => {
  store.dispatch(startCompilation());
  worker.postMessage(sourceCode);
};

export { compile };
