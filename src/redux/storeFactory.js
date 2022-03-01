import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducers/root.js';
import saga from './sagas/root.js';
import { setStore } from './store.js';

export default function storeFactory() {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(reducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(saga);
  setStore(store);
  return store;
}
