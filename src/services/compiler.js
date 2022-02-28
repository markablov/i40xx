import store from '../redux/store.js';
import startCompilation from '../redux/actions/startCompilation.js';
import finishCompilation from '../redux/actions/finishCompilation.js';

const worker = new Worker(new URL('../workers/compiler/compiler.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { dump, errors } }) => {
  store.dispatch(finishCompilation(dump, errors));
};

const compile = sourceCode => {
  store.dispatch(startCompilation());
  worker.postMessage(sourceCode);
};

export { compile };
