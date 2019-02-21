import * as Actions from '../constants.js';

const defaultState = {
  compiling: false,
  editor: null
};

export default (state = defaultState, { type, payload }) => {
  switch (type) {
  case Actions.SET_EDITOR_REF:
    return { ...state, editor: payload };
  case Actions.START_COMPILATION:
    return { ...state, compiling: true };
  default:
    return state;
  }
};
