import * as Actions from '../constants.js';

const defaultState = {
  compiling: false,
  compilerErrors: [],
  dump: null,
  editor: null
};

export default (state = defaultState, { type, payload }) => {
  switch (type) {
    case Actions.SET_EDITOR_REF:
      return { ...state, editor: payload };
    case Actions.START_COMPILATION:
      return { ...state, compiling: true };
    case Actions.FINISH_COMPILATION:
      return { ...state, compiling: false, dump: payload.dump, compilerErrors: payload.errors };
    default:
      return state;
  }
};
