import * as Actions from '../constants.js';

const defaultState = {
  configuration: {
    cpu: { chip: '4004' },
    rom: { chip: '4001', amount: 1 }
  },
  configurating: false,
  configurationError: null,
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
    case Actions.SET_CONFIGURATION:
      return { ...state, configuration: payload };
    case Actions.START_CONFIGURATION:
      return { ...state, configurating: true };
    case Actions.FINISH_CONFIGURATION:
      return { ...state, configurating: false, configurationError: payload.error };
    default:
      return state;
  }
};
