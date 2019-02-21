import { createStore } from 'redux';

import reducer from './reducers/root.js';

const store = createStore(reducer);

export default store;
