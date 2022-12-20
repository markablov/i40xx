import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import Root from './screens/Root.js';
import createStore from './redux/storeFactory.js';

ReactDOM.render(
  <Provider store={createStore()}>
    <Root />
  </Provider>,
  document.getElementById('root'),
);
