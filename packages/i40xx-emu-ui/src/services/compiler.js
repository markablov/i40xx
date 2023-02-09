import { getStore } from '../redux/store.js';
import startCompilation from '../redux/actions/startCompilation.js';
import finishCompilation from '../redux/actions/finishCompilation.js';

const worker = new Worker(new URL('../workers/compiler/compiler.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { dump, errors, sourceMap } }) => {
  getStore().dispatch(finishCompilation(dump, errors, sourceMap));
};

export default function compile(sourceCode) {
  getStore().dispatch(startCompilation());
  worker.postMessage(sourceCode);
}
